# AquaWatch

AquaWatch is a water-quality monitoring and alert dashboard. Its React/TypeScript frontend communicates with a FastAPI backend, which stores stations, sensors, readings, alerts, and threshold settings in MongoDB and runs a simulated sensor-reading loop.

The application is designed for native local development and deployment to Render. The backend requires MongoDB and fails startup rather than silently switching to another database.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Python 3.11+, FastAPI, Uvicorn, PyMongo
- Database: MongoDB (local development and MongoDB Atlas in production)
- Hosting: Render Blueprint (Python web service and static site)
- Tests: pytest and the existing TypeScript tests

## Project structure

```text
.
├── backend/
│   ├── database.py          # MongoDB connection and indexes
│   ├── init_mongo.py        # MongoDB index initializer
│   ├── main.py              # FastAPI routes and application lifespan
│   ├── requirements.txt     # Backend runtime dependencies
│   ├── requirements-dev.txt # Backend test dependencies
│   ├── schemas.py           # API request and response schemas
│   ├── simulator.py         # MongoDB-backed sensor simulator
│   └── tests/
├── src/                     # React app, components, and frontend utilities
├── server.ts                # Preserved legacy in-memory demo server; not used by Render
├── render.yaml              # Render services and environment configuration
├── .env.example             # Safe local environment template
├── package.json             # Vite scripts and frontend dependencies
└── vite.config.ts           # Vite development server and API proxy
```

## Prerequisites

- Windows PowerShell
- Python 3.11 or newer
- Node.js 20 or newer and npm
- MongoDB running locally on port 27017 for local development; a MongoDB Atlas cluster and database user for production
- GitHub account and a Render account for cloud hosting

## Local setup

Run commands from the project root unless noted otherwise. Do not overwrite an existing `.env`; if you do not have one yet, make a local copy of the template:

```powershell
Copy-Item .env.example .env
```

The example `.env` configures `mongodb://localhost:27017/` and the `aquawatch_db` database. Ensure MongoDB is running locally on port 27017; alternatively, start the Compose MongoDB service with `docker compose up -d mongo`. Before starting the full Compose stack, replace the `DB_PASSWORD` and `JWT_SECRET` placeholders with unique local values. Never commit `.env`.

### Backend

Create and activate a virtual environment:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements-dev.txt
```

Start FastAPI from the project root so `backend.main` resolves correctly:

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The API documentation is at `http://127.0.0.1:8000/docs`. On startup the service checks MongoDB, initializes indexes, and starts the simulator; on shutdown it stops the simulator and closes its MongoDB client.

### Frontend

Open another PowerShell terminal in the project root:

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173`). The existing `VITE_API_BASE_URL` variable points requests to the backend; when unset, Vite proxies `/api` requests to `http://localhost:8000`.

If the project path contains shell-special characters and npm reports that `node_modules/.bin` cannot be found, map the workspace to a temporary drive before running the npm commands:

```powershell
subst Z: "$PWD"
Set-Location Z:\
npm install
npm run dev
```

After stopping Vite, leave the mapped drive with `Set-Location $env:USERPROFILE` and remove it with `subst Z: /d`.

## MongoDB configuration

Set these backend variables in the root `.env` for local work and in Render for production:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Local development: `mongodb://localhost:27017/`. Production: private Atlas connection string. Keep it out of source control and frontend variables. |
| `MONGODB_DATABASE_NAME` | No | Database name; defaults to `aquawatch_db`. |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated frontend origins; defaults to local Vite origins. |

For production, create an Atlas database user with least-required permissions and permit the application host in Network Access. Do not use a public `0.0.0.0/0` rule unless you understand and accept its security implications.

Initialize indexes manually if needed:

```powershell
python -m backend.init_mongo
```

The FastAPI application also initializes indexes during startup. This only creates/ensures indexes; it does not delete collections or records.

## GitHub

Create a GitHub repository, then connect it to Render using the GitHub integration. For an existing local Git repository, the normal user-controlled workflow is:

```powershell
git status
git add .
git commit -m "Prepare AquaWatch for Render"
git push
```

Review the staged changes and ensure `.env` is not included before committing. This project setup does not push changes or create deployments automatically from this workspace.

## Render deployment

The root `render.yaml` defines two independent services. In Render, choose **New → Blueprint**, connect the GitHub repository, and apply the Blueprint.

### Backend service

- Name: `aquawatch-backend`
- Runtime: Python
- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

Set `MONGODB_URI` as a secret environment variable in Render and set `MONGODB_DATABASE_NAME` to `aquawatch_db`. Set `CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin (for example `https://aquawatch-frontend.onrender.com`) and include local origins if needed for development. Render supplies `PORT`.

### Frontend static site

- Name: `aquawatch-frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- `VITE_API_BASE_URL`: the full public backend URL (for example `https://aquawatch-backend-gg58.onrender.com`)
- Unknown routes rewrite to `/index.html`

Vite embeds `VITE_API_BASE_URL` at build time. If you change the backend URL, update the Blueprint value and rebuild the static site. This variable is public by design; never put database credentials or private keys in any `VITE_*` variable.

## API reference

FastAPI's interactive API documentation is available at `/docs`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | MongoDB readiness and station count |
| `GET`, `POST` | `/api/stations` | List and create monitoring stations |
| `GET`, `POST`, `PUT` | `/api/sensors` | List, create, and update sensor status |
| `GET` | `/api/readings/latest` | Latest reading for each station |
| `GET` | `/api/readings/history` | Historical readings |
| `GET` | `/api/alerts` | Filter and list alerts |
| `POST` | `/api/alerts/{id}/acknowledge` | Acknowledge an alert |
| `POST` | `/api/alerts/{id}/resolve` | Resolve an alert |
| `GET`, `PUT` | `/api/thresholds` | Read or update water-quality thresholds |
| `POST` | `/api/simulation/toggle` | Pause or resume simulation |
| `POST` | `/api/simulation/inject-anomaly` | Record a simulated anomaly |
| `POST` | `/api/simulation/reset` | Reset simulator settings without deleting stored readings or alerts |
| `GET` | `/api/reports/summary` | Reading and alert totals |
| `GET` | `/api/reports/export-csv` | Download stored readings as CSV |

## Tests and production verification

Run backend tests without connecting to or modifying MongoDB:

```powershell
python -m pytest backend -q
```

Run frontend checks:

```powershell
npm test
npm run lint
npm run build
```

After deployment, verify `https://<backend-host>/health`, `https://<backend-host>/ready`, and `https://<backend-host>/docs`. A healthy liveness response does not imply database readiness; `/ready` must report `ready` and `connected (MongoDB)`. Open the static frontend and check browser network requests for successful `/api/*` responses.

## Troubleshooting

- **Backend exits during startup:** verify MongoDB is running at the configured `MONGODB_URI`; for Atlas, also check database-user permissions, Network Access, and DNS/network access. The service intentionally does not fall back to SQL.
- **`/health` works but `/ready` returns 503:** the web process is alive but cannot reach MongoDB; inspect backend logs and the configured MongoDB server.
- **Frontend reports a network/CORS error:** verify the deployed `VITE_API_BASE_URL`, set the exact static-site origin in `CORS_ALLOWED_ORIGINS`, then rebuild/redeploy the frontend.
- **Render static routes return 404 after refresh:** confirm the static-site rewrite to `/index.html` is present.
- **Local frontend cannot reach the API:** keep the backend running on port 8000 and check `VITE_API_BASE_URL` or the Vite `/api` proxy.
- **PowerShell activation is blocked:** for the current terminal only, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate the virtual environment.

## Deployment cleanup note

The former `k8s/` directory contained a namespace, ConfigMap, placeholder Secret, PostgreSQL deployment/PVC/service, FastAPI deployment/service, frontend deployment/service, and ingress/TLS routing. Those Kubernetes manifests and the old container build/orchestration files are removed in favor of Render and MongoDB Atlas. Application source, API tests, MongoDB configuration, and legacy SQL schema/model files are not removed by this hosting migration.
