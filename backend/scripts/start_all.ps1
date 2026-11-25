# Auto‑setup and launch script for the AI‑LLM project (Windows PowerShell)
# ---------------------------------------------------------------
# This script performs the following actions in order:
#   1️⃣ Activate the Python virtual environment.
#   2️⃣ Ensure required Python packages (incl. alembic) are installed.
#   3️⃣ Apply any pending database migrations (adds missing columns etc.).
#   4️⃣ Start the FastAPI backend (uvicorn).
#   5️⃣ (Optional) Launch the Angular frontend.
# ---------------------------------------------------------------

# ----- 1️⃣ Activate virtual environment -----
$venv = "C:\Users\PujaDas\Downloads\AI-LLM\backend\.venv\Scripts\Activate.ps1"
if (Test-Path $venv) {
    & $venv
} else {
    Write-Error "Virtual‑env activation script not found at $venv"
    exit 1
}

# ----- 2️⃣ Install / upgrade Python dependencies -----
Write-Host "Installing Python dependencies..."
python -m pip install -U pip setuptools wheel
# The project likely has a requirements.txt in the backend folder
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
} else {
    Write-Warning "requirements.txt not found – ensure needed packages (fastapi, sqlalchemy, alembic, psycopg, etc.) are installed manually."
}

# Ensure Alembic is present (use pip if missing)
if (-not (Get-Command alembic -ErrorAction SilentlyContinue)) {
    Write-Host "Alembic not installed – installing now..."
    pip install alembic
}

# ----- 3️⃣ Apply database migrations -----
Write-Host "Running Alembic migrations (upgrade head)..."
# Alembic will read DATABASE_URL from the .env file – load it first
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match "^\s*([A-Z_][A-Z0-9_]*)\s*=\s*\"?(.*?)\"?\s*$") {
            $envName = $Matches[1]
            $envVal  = $Matches[2]
            Set-Item -Path "Env:$envName" -Value $envVal
        }
    }
}

# Initialise Alembic if the folder does not exist yet (first run)
if (-not (Test-Path "alembic")) {
    Write-Host "Initialising Alembic migration environment..."
    alembic init alembic
    # After init, we need to edit alembic/env.py – the script does a simple in‑place edit
    $envFile = "alembic\env.py"
    (Get-Content $envFile) -replace "target_metadata = None", "from app.db.base import Base`n`ntarget_metadata = Base.metadata" | Set-Content $envFile
    # Override DB URL from environment
    (Get-Content $envFile) -replace "config.set_main_option\(\"sqlalchemy.url\", .+\)", "config.set_main_option(\"sqlalchemy.url\", \"$env:DATABASE_URL\")" | Set-Content $envFile
}

# Create migration to add missing full_name column (if not already present)
# This will generate a migration only when the model differs from the DB.
Write-Host "Generating migration for any model changes..."
alembic revision --autogenerate -m "sync models – add missing columns" | Out-Null

# Apply all pending migrations
alembic upgrade head

# ----- 4️⃣ Start the FastAPI backend -----
Write-Host "Launching FastAPI backend (uvicorn)..."
# Use the host/port defined in .env (fallback to 127.0.0.1:8000)
$host = $env:HOST ? $env:HOST : "127.0.0.1"
$port = $env:PORT ? $env:PORT : "8000"
uvicorn app.main:app --host $host --port $port &
$backendPid = $LASTEXITCODE

# ----- 5️⃣ (Optional) Start the Angular frontend -----
# If you have Node/npm installed and the frontend folder contains a package.json
if (Test-Path "..\frontend\package.json") {
    Write-Host "Starting Angular frontend..."
    Push-Location "..\frontend"
    npm install # ensure deps are present (won't run if already installed)
    npm start &
    Pop-Location
} else {
    Write-Warning "Frontend not detected – skip starting Angular UI."
}

Write-Host "All services launched. Backend PID=$backendPid"

# Keep the script alive so that background processes stay running
# (Press Ctrl+C to stop everything)
while ($true) { Start-Sleep -Seconds 5 }
