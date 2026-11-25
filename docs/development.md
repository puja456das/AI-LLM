# Windows development guide

## Prerequisites

- Python 3.11 or newer
- Node.js 22.22.3+ or 24.15.0+ and npm (required by the current Angular 22 release)
- PostgreSQL 15+ for persistent development (SQLite works for the first auth walkthrough)
- VS Code with Python and Angular/TypeScript extensions

## Run both services together

After completing the initial setup once, open PowerShell at the repository root and run:

```powershell
npm run dev
```

The runner uses Node 24.15 through `npx`, starts FastAPI and Angular in the same terminal, labels output as `[api]` and `[web]`, and stops both when you press `Ctrl+C`. On first use, `npx` may download the compatible Node runtime. It checks that `backend/.env`, the backend virtual environment, and frontend npm packages are present.

## Initial setup

In PowerShell:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

Keep your configured database connection string and randomly generated `JWT_SECRET_KEY` in `.env`; do not commit that file. The first API run creates the users table. Schema evolution will move to Alembic in the persistence-hardening increment.

## Frontend setup

Install the frontend dependencies once:

```powershell
cd frontend
npm install
```

Then start both services together from the repository root with `npm run dev`. The Angular development server proxies `/api` requests to `http://localhost:8000`; open `http://localhost:4200`.

## Auth API walkthrough (Postman)

1. `GET http://localhost:8000/api/v1/health` should return `{"status":"ok"}`.
2. `POST http://localhost:8000/api/v1/auth/register` with JSON `{"email":"dev@example.com","password":"StrongPass123!","full_name":"Dev User"}`. Expect `201` and an access token.
3. `POST http://localhost:8000/api/v1/auth/login` with form fields `username=dev@example.com` and `password=StrongPass123!` (OAuth2 password form). Expect a bearer token.
4. Set `Authorization: Bearer <access_token>` and call `GET http://localhost:8000/api/v1/auth/me`. Expect the signed-in profile.
5. Try a wrong password (`401`), duplicate email (`409`), and `/me` without a token (`401`).

Interactive request schemas are also available at `http://localhost:8000/docs`. The access token is short-lived. Logout is currently client-side token disposal; refresh-token rotation and server-side revocation belong in the auth hardening step before production deployment.

## Run backend tests

From `backend` with the virtual environment active:

```powershell
python -m pytest -p no:cacheprovider tests
```

These auth tests use an isolated in-memory SQLite database and do not touch your development database.

## Dataset-backed AI model

The O*NET 31.0 source CSV files and attribution are in `backend/data`. A trained model artifact is included, so resume analysis is available without retraining. To reproduce training and evaluation from the included data, run this from `backend` with the virtual environment active:

```powershell
python -m app.ml.train
```

This reports the held-out precision, recall, and macro F1 and rewrites the model artifact and `app/ml/artifacts/training_metrics.json`. The current model was trained on 15,030 task statements and evaluated on 3,758 held-out task statements. Its macro F1 is 0.5292 for occupation-family classification. This metric does not measure resume quality, job-match probability, or hiring success.

The authenticated endpoint is `POST /api/v1/ai/analyze-resume` with a `file` form field containing a PDF or DOCX. It returns a family prediction, recognized software skills, top occupation-profile similarities, and matching/missing skills. Resume content is processed in memory and is not persisted by this feature. Scanned PDF OCR and LLM-generated feedback are not implemented yet.

### Try resume analysis in Postman

1. Register or log in using the auth walkthrough and copy the access token.
2. Create `POST http://localhost:8000/api/v1/ai/analyze-resume`.
3. In **Authorization**, choose **Bearer Token** and paste the access token.
4. In **Body → form-data**, create a key named `file`, change its type to **File**, and select a text-based `.pdf` or `.docx` under 5 MB.
5. Send the request. The response includes the model and dataset summary used for that analysis.

## Troubleshooting

- If PowerShell blocks venv activation, run `Set-ExecutionPolicy -Scope Process Bypass` in that terminal, then activate again.
- If port 8000 is occupied, use `uvicorn app.main:app --reload --port 8001` and update `frontend/proxy.conf.json`.
- If using PostgreSQL, verify the service is running and the database exists before starting the API.
