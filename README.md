# CareerPilot AI

An AI-assisted career development platform. The project is being built in working modules, starting with architecture, project setup, and account authentication.

## Project status

- [x] System architecture and development plan
- [x] Initial backend setup and registration/login/profile APIs
- [x] Angular application shell and authentication screens
- [x] O*NET-trained occupation-family classifier and resume role/skill analysis
- [x] Dataset-trained resume occupation-family analysis, role recommendations, and software-skill gaps
- [ ] LLM feedback, learning roadmaps, interview coach, cover letters, application tracker, and analytics

## Architecture and setup

See [docs/architecture.md](docs/architecture.md) for the system diagram, proposed folder layout, data model, roadmap, and UI design. See [docs/development.md](docs/development.md) for Windows setup and API walkthrough.

The first dataset-backed AI flow is available at **Resume Review** after login. It reads PDF/DOCX files, predicts a broad occupation family, recognizes O*NET software-skill examples, and ranks occupation profiles. The dataset source, preparation, evaluation results, and license attribution are documented in [backend/data/README.md](backend/data/README.md).

## Run locally

1. Configure `backend/.env` with your database URL and a strong `JWT_SECRET_KEY`.
2. Install backend dependencies in `backend/.venv` and run `npm install` inside `frontend` once.
3. From the repository root, run `npm run dev` to start both services. The command uses a compatible Node 24.15 runtime through `npx` if needed. Press `Ctrl+C` to stop them.

The app is at `http://localhost:4200`; API docs are at `http://localhost:8000/docs`. Configure PostgreSQL with `DATABASE_URL` for persistent local data. SQLite is the development default when no URL is provided.

## Security note

This is an actively developed portfolio project. Before deployment, configure HTTPS, a managed PostgreSQL database, a strong unique signing key, restrictive CORS origins, and production secret management. Do not commit `.env` files or real credentials.
