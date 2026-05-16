# OAuth & auth — Phase 1 checklist (codebase verified)

Verification against `collabsphere-prj03/collabsphere-repo-recovery` (Nest `apps/api`, Vite `apps/web`). **Current user profile:** `GET /api/v1/users/me` — not `GET /auth/me`.

**Schema-optional (OAuthAccount):** intentionally not migrated — see [`oauth-auth-schema-deferred.md`](./oauth-auth-schema-deferred.md).

## Backend API (`apps/api`, prefix `api/v1`)

| Item | Status |
|------|--------|
| POST `/auth/register` | [x] `AuthNestController.register` → `AuthAppService.register` |
| POST `/auth/login` | [x] Sets refresh + CSRF cookies; returns access JWT + user in envelope |
| POST `/auth/logout` / `logout-all` | [x] |
| POST `/auth/refresh` | [x] CSRF double-submit + refresh cookie; rotates tokens |
| GET `/auth/google` + `/auth/google/callback` | [x] `GoogleOAuthService`; gated when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` unset. OAuth `state` is **HMAC-signed** (`google-oauth-state.ts`) so callback works even when Google’s redirect host differs from the `/auth/google` host (no cookie required; legacy cookie still accepted). |
| POST `/auth/forgot-password`, `/auth/reset-password` | [x] |
| POST `/auth/verify-email`, `/auth/resend-verification` | [x] |
| GET `/auth/me` as canonical “me” | [ ] **Not used** — canonical is **`GET /users/me`** (`UsersNestController.getMe`) |
| POST `/auth/collab-token` | [x] |

## Frontend (`apps/web`)

| Item | Status |
|------|--------|
| Login / Register / Forgot / Reset / Verify routes | [x] `app/routing/app-routes.tsx` + `features/auth/pages/*` |
| OAuthButton → API Google start URL | [x] Navigates to `{API_BASE}/auth/google` via `resolveConfiguredApiBaseUrl()` |
| OAuth callback / post-login UX | [~] Callback returns **JSON** (`wrapSuccessResponse`); browser redirect from Google lands on API — SPA may need a dedicated “complete OAuth” flow or web redirect wrapper (not re-audited here) |

## Security

| Item | Status |
|------|--------|
| Password hashing | [x] `bcryptjs` in auth paths; cost from env (`BCRYPT_COST` in `packages/shared` `parseApiRuntimeEnv`) |
| JWT | [x] `jose` HS256 (`jwt-access.service.ts`) |
| CSRF | [x] `CsrfGuard` + double-submit on refresh; `X-CSRF-Token` on mutating web requests |
| Rate limiting | [x] **ThrottlerModule** global `ttl: 60000`, `limit: 100` (`app.module.ts`); **domain** limiters for register / verify-email (`auth.service.ts` + `register-rate-limit` / `verify-email-rate-limit`) |
| SQL injection | [x] Prisma |

## Database vs extended template

| Item | Status |
|------|--------|
| `OAuthAccount` / `AuthLog` / `isBanned` extras | [ ] Deferred — see `docs/agent-ref/ops/oauth-auth-schema-deferred.md` |

## Email

| Item | Status |
|------|--------|
| Queue-based verification | [x] Jobs enqueued from auth domain (`enqueueVerificationEmailJob` / related); worker + SMTP per `env-vars.md` / `local-dev.md` |
