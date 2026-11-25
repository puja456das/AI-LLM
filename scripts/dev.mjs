import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Test comment added by Antigravity to verify file editing capabilities
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const isWindows = process.platform === 'win32';
const python = path.join(backend, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python');
const angularCli = path.join(frontend, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

function nodeVersionSupported(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return (major === 22 && (minor > 22 || (minor === 22 && patch >= 3)))
    || (major === 24 && minor >= 12)
    || major >= 26;
}

if (!nodeVersionSupported(process.versions.node)) {
  console.error(`CareerPilot's Angular version needs Node 22.22.3+, 24.15.0+, or 26+. Current version: ${process.versions.node}`);
  process.exit(1);
}

const missing = [
  [path.join(backend, '.env'), 'backend/.env (configure your database URL and JWT secret)'],
  [python, 'backend virtual environment (create it and install backend/requirements-dev.txt)'],
  [angularCli, 'frontend dependencies (run npm install inside frontend)']
].filter(([file]) => !existsSync(file));

if (missing.length) {
  console.error('CareerPilot is not ready to start. Missing setup:');
  for (const [, instruction] of missing) console.error(`  - ${instruction}`);
  process.exit(1);
}

const children = [];
let stopping = false;

function start(label, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: false });
  children.push(child);

  for (const [stream, source] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
    const lines = createInterface({ input: source });
    lines.on('line', (line) => process[stream].write(`[${label}] ${line}\n`));
  }

  child.on('error', (error) => {
    console.error(`[${label}] Could not start: ${error.message}`);
    void shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.log(`[${label}] stopped (${signal ?? `exit ${code ?? 'unknown'}`}); stopping the other service.`);
      void shutdown(code && code !== 0 ? code : 0);
    }
  });
}

function stop(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
}

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) stop(child);
  await Promise.race([
    Promise.all(children.map((child) => child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('close', resolve)))),
    new Promise((resolve) => setTimeout(resolve, 4000))
  ]);
  process.exit(exitCode);
}

process.on('SIGINT', () => { console.log('\nStopping CareerPilot...'); void shutdown(0); });
process.on('SIGTERM', () => { void shutdown(0); });

console.log('Starting CareerPilot API and Angular app. Press Ctrl+C to stop both.');
start('api', python, ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], backend);
start('web', process.execPath, [angularCli, 'serve', '--proxy-config', 'proxy.conf.json', '--host', '127.0.0.1', '--port', '4201'], frontend);
