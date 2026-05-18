/**
 * Production-style Nest entry (same bootstrap as `dev.ts`).
 * Global filters, interceptors, pipes, helmet, and CORS are configured in `nest-app-bootstrap.ts`.
 * Local `pnpm dev` runs `apps/api/src/dev.ts` via the api package script.
 */
import "./dev.js";
