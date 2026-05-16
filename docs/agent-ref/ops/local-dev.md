# Local Development (agent-ref)

## Purpose
Provide an execution-focused reference for local development setup, prerequisites, and required services for CollabSphere.

## Canonical Sources
- `docs/spec/14-devops/14.2-local-dev-environment.md`
- `docs/spec/14-devops/14.3-environments.md`
- `docs/spec/14-devops/14.4-db-migrations.md`
- `docs/domains/architecture/env-config.md`

## Domain Sources
- `docs/domains/architecture/env-config.md`

## Scope
- Prerequisites and tooling
- One-command local startup
- Required Docker services
- Local environment rules
- Optional local services

## Required Rules / Contract

### Prerequisites
- Node.js 20 LTS
- pnpm 9.x
- Docker Desktop (or Docker Engine + Compose)
- Git

### One-command local startup
```/dev/null/bash#L1-4
pnpm install
pnpm dev
```

`pnpm dev` starts:
- `apps/web` (Vite dev server on **port 8080** by default — see `apps/web/vite.config.ts`)
- `apps/api` (NestJS REST + Socket.IO, default **PORT=3001**, **HOST=0.0.0.0** — see `apps/api/src/dev.ts`)
- `apps/collab` (Hocuspocus)
- `apps/worker` (BullMQ workers)

### Required local services (Docker)
Minimum services:
- PostgreSQL
- Redis

Optional (v1.1+):
- MinIO (S3-compatible local object storage)
- MailHog (email capture)

### Environment rules
- `.env.local` must never be committed.
- `.env.example` must be committed and kept in sync.

## Edge Cases / Failure Modes
- If Postgres or Redis are not running, `api`, `collab`, and `worker` will fail to start or behave inconsistently.
- Missing or invalid env vars can lead to silent startup failures; ensure `.env.local` is complete.

## Frontend “Failed to fetch” / “Couldn’t load …” (connectivity)

Symptoms: many pages show **Failed to fetch**, or section titles like **Couldn’t load workspaces** / **Couldn’t load activity**. That almost always means the **browser never got an HTTP response** (not a normal JSON error from Nest).

### Two ports (this is expected)

| Port | Process | Role |
| --- | --- | --- |
| **8080** | Vite (`apps/web`) | Serves the UI in dev. |
| **3001** | Nest (`apps/api`) | REST + Socket.IO. |

**Default dev HTTP:** the browser calls **`http://127.0.0.1:3001/api/v1`** (same host as the tab when possible) so requests **do not** depend on the Vite `/api/v1` proxy, which can hang indefinitely on some Windows setups. Optional: **`VITE_USE_DEV_PROXY=true`** uses same-origin **`/api/v1`** on **8080** (Vite proxies to **3001**).

### Checklist (in order)

1. **Open the app on Vite** — `http://127.0.0.1:8080` (or `http://localhost:8080`).
2. **API is running on 3001**. From a terminal:
   - `curl.exe -sS http://127.0.0.1:3001/api/v1/health` (expect `200` and JSON).
3. **Postgres and Redis** are running (`docker compose up -d` at repo root). If the API exits during bootstrap, the UI hangs or errors on every page.
4. **Hung tab / spinner:** remove **`VITE_USE_DEV_PROXY=true`** from `.env.local` unless you need it; keep the default **direct** API on **3001**.
5. **`NODE_ENV` for the API**: In **development**, CORS uses a reflective `origin: true`. If you run the API with **`NODE_ENV=production`**, only `FRONTEND_URL` (or the default app URL) is allowed — the browser may block calls from **8080**. Prefer `development` for local API runs.
6. **Socket.IO:** With the default direct REST base, realtime uses **`http://127.0.0.1:3001`**. With **`VITE_USE_DEV_PROXY=true`**, same-origin `/` + Vite **`/socket.io`** proxy applies (`vite.config.ts`). You can override with **`VITE_REALTIME_BASE_URL`**.

### Access tokens and `JWT_ACCESS_SECRET`

If many requests fail with **401** / **Invalid token** after the API was working:

1. Confirm **`JWT_ACCESS_SECRET`** in the env file loaded by **`apps/api`** matches what was used when users signed in. Rotating this secret **invalidates every stored access token** until each user signs in again.
2. Sign out in the web app (or clear `localStorage` key `cs-auth-session`) and sign back in so the client receives a fresh Bearer token and CSRF bootstrap from **`POST /auth/login`**.

### Repo files involved

| Area | File |
| --- | --- |
| REST base URL, loopback normalization | `apps/web/src/api/client/index.ts` |
| Client bootstrap | `apps/web/src/app/providers/app-providers.tsx` |
| User-visible fetch hints | `apps/web/src/lib/fetch-error-details.ts` |
| Vite HTTP + WS proxy | `apps/web/vite.config.ts` |
| Socket.IO URL | `apps/web/src/api/realtime/socket-client.ts` |
| API listen host/port, CORS | `apps/api/src/dev.ts` |
| Joi default `PORT` (must match dev bootstrap) | `apps/api/src/config/config.schema.ts` |

## Troubleshooting API crash on startup (connection refused)

If `curl http://127.0.0.1:3001/api/v1/health` fails with **connection refused** and the API terminal shows a **SyntaxError** at module load (e.g. duplicate import in `folders.nest.controller.ts`), Nest never binds to port 3001. Fix the compile error and restart `pnpm dev`. See `IMPLEMENTATION_STATUS.md` (Critical fix — API startup crash).

## Troubleshooting API 404 on `/api/v1/workspaces`

If the browser shows **404** on `POST http://127.0.0.1:3001/api/v1/workspaces` but something still responds on port 3001:

1. Confirm Nest identity: `curl -s http://127.0.0.1:3001/api/v1/health` (expect JSON envelope with healthy status).
2. List routes (dev only): `curl -s http://127.0.0.1:3001/api/v1/dev/routes` and verify `POST /api/v1/workspaces` appears under `critical`.
3. Check which process owns the port: `netstat -ano | findstr :3001` (Windows) and restart from repo root: `pnpm dev`.
4. Open the SPA at **`http://127.0.0.1:8080`** (not `localhost`) so cookies match `.env` (`API_BASE_URL`, `WEB_APP_URL`).

Activity feed **500** on `GET .../activity` usually means migrations are missing — run `pnpm prisma migrate deploy` from repo root.

## Validation or Testing Notes
- Verify API and collab services can connect to Postgres and Redis before running tests.
- Confirm `pnpm dev` boots all four app services without errors.
- For local API checks, use `curl` against `http://127.0.0.1:3001/api/v1/health` (see **Frontend “Failed to fetch”** above if this fails from the host).

### Demo logins (database-backed)

Seeded users are **not** created automatically. After Postgres is up and migrations have been applied, run **`pnpm demo:seed-runtime`** from the repo root. Then sign in with **`elshaday@collabsphere.app` / `Demo1234!`** (global admin) or **`kidist@collabsphere.app` / `Demo1234!`**. Optional Phase 2 fixtures: **`pnpm phase2:seed-runtime`** → **`phase2.tester@collabsphere.local` / `Phase2!Test123`**, **`phase2.admin@collabsphere.local` / `Phase2!Admin123`**. See `.env.example` footer for the same list.

## Related Files / Domains
- `docs/agent-ref/ops/env-vars.md`
- `docs/agent-ref/ops/migrations.md`
- `docs/agent-ref/ops/ci-cd.md`
- `docs/agent-ref/ops/deployment.md`
- `docs/agent-ref/rules/security-rules.md`


