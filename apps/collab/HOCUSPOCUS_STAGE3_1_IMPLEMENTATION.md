# Hocuspocus Stage 3.1 Implementation Notes

This document summarizes the Stage 3.1 collab-server scaffold implemented in `apps/collab/`.

## Implemented

- Added `src/config/validate-env.ts`:
  - Validates required variables: `PORT`, `DATABASE_URL`, `REDIS_URL`, `COLLAB_JWT_SECRET`, `NODE_ENV`.
  - Fails startup when `COLLAB_JWT_SECRET` is shorter than 32 chars.
  - Logs all validation failures and exits with code `1`.
  - Normalizes existing monorepo collab env names:
    - `COLLAB_DATABASE_URL -> DATABASE_URL`
    - `COLLAB_REDIS_URL -> REDIS_URL`
  - Invokes validation on module load so importing it in `main.ts` enforces early checks.

- Added `src/lib/prisma.ts`:
  - Singleton `PrismaClient` export (`prisma`).
  - Logging:
    - `local`: `query`, `warn`, `error`
    - other envs: `warn`, `error`

- Added `src/lib/redis.ts`:
  - Singleton Redis client via `redis` package `createClient`.
  - Exported `getRedis()`:
    - Connects once when not already open.
    - Reuses existing client afterward.
  - Exported `disconnectRedis()`:
    - Quits and clears singleton state.

- Added `src/main.ts`:
  - First import is `./config/validate-env.js` so env validation runs before app bootstrap.
  - Configures Hocuspocus with an explicit empty `extensions` array.
  - Runs DB preflight before listen:
    - `await prisma.$queryRaw\`SELECT 1\``
    - Exits if DB is unreachable.
  - Runs Redis preflight using `getRedis()` before listen.
  - Graceful shutdown for `SIGINT` and `SIGTERM`:
    - Uses `isShuttingDown` guard against double execution.
    - Order: `server.destroy()` -> `prisma.$disconnect()` -> `disconnectRedis()` -> exit `0`.
    - Logs `[collab] Shutdown complete`.
  - Startup log after successful listen:
    - `[collab] Server listening on port <port>`.

- Updated `apps/collab/package.json`:
  - Added dependency: `redis`.
  - Added scripts:
    - `dev:main`
    - `start` (`node dist/main.js`)
  - Kept existing collab bootstrap build flow; `main.js` now exists under `apps/collab/dist/main.js` after build.

- Updated lockfile:
  - `pnpm-lock.yaml` now includes `redis` for `@collabsphere/collab`.

## Validation performed

- `pnpm install` completed successfully.
- `pnpm --filter @collabsphere/collab run build` completed successfully.
- Startup with missing `COLLAB_JWT_SECRET` fails and exits `1`.
- Startup with invalid DB URL fails during DB preflight before server listen.

## Notes

- This stage intentionally keeps existing `src/dev.ts` and `src/hocuspocus-server.ts` in place.
- Extensions are intentionally left empty in `main.ts`; extension migration happens in subsequent prompts.
