# Phase 0 command outputs (redacted)

Generated from **`collabsphere-prj03/collabsphere-repo-recovery`** repo root. No `.env` or secret values are reproduced here.

## Commands

- `rg --files -g "*auth*" apps/web/src`
- `rg --files -g "*login*" apps/web/src`
- `rg --files apps/web/src/features/auth`
- `rg --files apps/web/src/app/routing`
- `rg "@(Post|Get|Put|Patch|Delete)\\(" apps/api/src/auth/auth.nest.controller.ts`
- `rg "import.meta.env" apps/web/src -g "*.ts" -g "*.tsx"` (sampled)

## Auth-related web files (`*auth*`)

- `apps/web/src/lib/auth-session.ts`
- `apps/web/src/app/routing/auth-guards.tsx`
- `apps/web/src/api/adapters/auth.ts`
- `apps/web/src/api/adapters/auth.test.ts`
- `apps/web/src/features/auth/components/oauth-button.tsx`
- `apps/web/src/features/auth/components/auth-error-banner.tsx`
- `apps/web/src/features/auth/components/auth-status-card.tsx`
- `apps/web/src/features/auth/components/auth-layout.tsx`
- `apps/web/src/features/auth/components/auth-divider.tsx`
- `apps/web/src/features/auth/components/login-form.tsx`

## Login-named files (`*login*`)

- `apps/web/src/features/auth/components/login-form.tsx`

## Routing

- `apps/web/src/app/routing/auth-guards.tsx`
- `apps/web/src/app/routing/app-routes.tsx`

## `auth.nest.controller.ts` route decorators (rg excerpt)

`@Post("register")`, `@Post("verify-email")`, `@Post("login")`, `@Post("refresh")`, `@Post("logout")`, `@Post("logout-all")`, `@Post("resend-verification")`, `@Post("forgot-password")`, `@Post("reset-password")`, `@Post("collab-token")`, `@Get("google")`, `@Get("google/callback")`.

## Sample `import.meta.env` references (web)

- `apps/web/src/api/client/index.ts` — `DEV`, `VITE_USE_DEV_PROXY`, `VITE_API_BASE_URL`, `VITE_REALTIME_BASE_URL`
- `apps/web/src/features/documents/collab/collab-bootstrap.ts` — `VITE_COLLAB_WS_URL`
