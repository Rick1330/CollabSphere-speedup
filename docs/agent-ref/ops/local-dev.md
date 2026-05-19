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
6. **Socket.IO:** Client connects to namespace **`/realtime`** (websocket only, path **`/socket.io`**). With the default direct REST base, origin is **`http://127.0.0.1:3001`**. With **`VITE_USE_DEV_PROXY=true`**, same-origin `/` + Vite **`/socket.io`** proxy applies (`vite.config.ts`). Override origin with **`VITE_SOCKET_URL`** (alias) or **`VITE_REALTIME_BASE_URL`**.
7. **API realtime stack:** `apps/api/src/nest-app-bootstrap.ts` attaches the root **`RedisIoAdapter`** (multi-instance fan-out). `apps/api/src/realtime/realtime.gateway.ts` adds the **awareness** bridge (`awareness:doc:*` → `document:awareness`) and does **not** duplicate the Redis adapter when the root already has one. Set **`SKIP_REDIS_IO_ADAPTER=1`** to disable root Redis adapter (single-instance mode).
8. **Verify WebSocket:** Sign in → DevTools → **Network** → **WS** → one connection whose URL includes **`/realtime`** and **`transport=websocket`**. After a workspace role change via API, frames should include **`workspace:role_changed`**.

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
| Socket.IO client | `apps/web/src/api/realtime/socket-client.ts` (re-export: `apps/web/src/lib/socket.ts`) |
| Realtime gateway + Redis bootstrap | `apps/api/src/realtime/realtime.gateway.ts`, `apps/api/src/nest-app-bootstrap.ts` |
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

### Dashboard activity **500** or **503** on `GET .../workspaces/:id/activity`

The dashboard loads recent activity from the first few workspaces.

**Missing table:** If `activity_events` is missing, the API returns **503** with a message to run migrations (older builds returned **500**).

**`PrismaClientValidationError` on `take` (string):** Query params arrive as strings when the global `ValidationPipe` is not enabled. The activity controller/service coerce `page` / `pageSize` to numbers before calling Prisma. If you still see this after pulling latest, restart `pnpm dev`.

1. Ensure Postgres is up: `docker compose up -d`
2. Apply migrations: `pnpm prisma migrate deploy` (from repo root; creates `activity_events` via `20260515130000_add_activity_events`)
3. Optional demo rows: `pnpm demo:seed-runtime` (includes sample `activity_events` for Project Alpha / Thesis Lab)
4. Restart `pnpm dev` and reload `/dashboard` — Network tab should show **200** on `/activity` requests (empty list is OK before seeding)

## Validation or Testing Notes
- Verify API and collab services can connect to Postgres and Redis before running tests.
- Confirm `pnpm dev` boots all four app services without errors.
- For local API checks, use `curl` against `http://127.0.0.1:3001/api/v1/health` (see **Frontend “Failed to fetch”** above if this fails from the host).

### Demo logins (database-backed)

Seeded users are **not** created automatically. After Postgres is up and migrations have been applied, run **`pnpm demo:seed-runtime`** from the repo root. Then sign in with **`elshaday@collabsphere.app` / `Demo1234!`** (global admin) or **`kidist@collabsphere.app` / `Demo1234!`**. Optional Phase 2 fixtures: **`pnpm phase2:seed-runtime`** → **`phase2.tester@collabsphere.local` / `Phase2!Test123`**, **`phase2.admin@collabsphere.local` / `Phase2!Admin123`**. See `.env.example` footer for the same list.

## Authentication (email + Google OAuth)

### Port layout (do not merge these)

| Port | Service | Notes |
| --- | --- | --- |
| **8080** | Vite (`apps/web`) | Open the UI here: `http://127.0.0.1:8080` |
| **3001** | Nest API | REST + OAuth callback + Socket.IO |
| **3002** | Collab (Hocuspocus) | Set via **`COLLAB_PORT`** — never bind collab to root **`PORT`** (3001) |

`scripts/dev.ts` starts **API first**, waits for **`GET /api/v1/health`**, then web/collab/worker. Vite uses **`strictPort: true`** so it fails instead of silently moving to **8081** when **8080** is taken.

### One `pnpm dev` only

If `pnpm dev` prints **`PORT 3001 is already in use. Stop it with: taskkill /PID …`**:

- An API is **already running** (often from another terminal). Either use **`http://127.0.0.1:8080`** without starting dev again, or kill the PID and run **one** `pnpm dev --skip-compose`.
- Never run two `pnpm dev` sessions — the second can pass a port check then crash with **`EADDRINUSE`**, leaving Vite up while the API is dead (login **500**, OAuth **`chrome-error://`**).

### Email / password login

1. Seed: `pnpm demo:seed-runtime` (after `pnpm prisma migrate deploy`).
2. Open **`http://127.0.0.1:8080/login`**.
3. Use demo credentials (also shown on the login form in dev).
4. Default REST base: direct **`http://127.0.0.1:3001/api/v1`** unless **`VITE_USE_DEV_PROXY=true`** (then same-origin **`/api/v1`** on 8080).

### Google OAuth flow

1. **Start URL** (browser navigates here): **`http://127.0.0.1:3001/api/v1/auth/google`** — implemented in `resolveOAuthStartUrl()` / `oauth-button.tsx` (not the Vite proxy path).
2. **Redirect URI** (Google Cloud Console must match exactly): **`http://127.0.0.1:3001/api/v1/auth/google/callback`** — logged at API startup when `GOOGLE_CLIENT_ID` is set.
3. After Google, the API redirects to **`WEB_APP_URL`** (default `http://127.0.0.1:8080`) with tokens in **`/login#oauth=...`**. The SPA reads the hash in `Login.tsx` and calls **`GET /users/me`** to verify the API is reachable.
4. **Do not** bookmark or refresh a long `.../google/callback?code=...` URL in the address bar; if the API was down you get **`chrome-error://chromewebdata/`** and a misleading “Unsafe attempt to load URL” console message.

### OAuth / login failure quick checks

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `chrome-error://` on callback | API not listening on **3001** | Restart single `pnpm dev`; `curl http://127.0.0.1:3001/api/v1/health` |
| Login **500** on `POST …/auth/login` | API crashed or proxy to dead process | Same as above |
| `PORT 3001 is already in use` | Stale `node` on 3001 | `taskkill /PID <pid> /F` or use existing stack |
| Vite on **8081** | **8080** busy | Free **8080**; do not use **8081** if `WEB_APP_URL` is **8080** |
| `INVALID_CREDENTIALS` | DB not seeded | `pnpm demo:seed-runtime` |
| `?error=OAUTH_STATE_MISMATCH` on `/login` | Stale OAuth attempt | Click **Continue with Google** again from `/login` |

### Key implementation files

| Area | File |
| --- | --- |
| OAuth callback (no double response) | `apps/api/src/auth/auth.nest.controller.ts` |
| OAuth start URL | `apps/web/src/api/client/index.ts`, `oauth-button.tsx` |
| Login page / hash handling | `apps/web/src/features/auth/pages/Login.tsx` |
| Dev API health banner | `apps/web/src/lib/dev-auth-troubleshooting.ts` |
| Collab port | `apps/collab/src/dev.ts` (`COLLAB_PORT` only) |
| Dev orchestration | `scripts/dev.ts` |
| CSRF cookie hydration | `apps/web/src/lib/auth-session.ts` |
| `authSession` in API client | `apps/web/src/app/providers/app-providers.tsx` |

## Related Files / Domains
- `docs/agent-ref/ops/env-vars.md`
- `docs/agent-ref/ops/migrations.md`
- `docs/agent-ref/ops/ci-cd.md`
- `docs/agent-ref/ops/deployment.md`
- `docs/agent-ref/rules/security-rules.md`


