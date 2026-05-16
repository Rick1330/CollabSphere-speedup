# Tech stack & auth questionnaire

Answers are based on the **`collabsphere-prj03/collabsphere-repo-recovery`** tree in workspace `D:/coloe` (a partial recovery snapshot: **no monorepo root `package.json`** or `pnpm-workspace.yaml` were found here; **`apps/web` imports `@/app/routing/app-routes` but that module is absent** from this snapshot).

---

## 1. Tech stack: Backend framework, Frontend framework, Database, Current authentication library

| Area | Evidence-based answer |
| --- | --- |
| **Backend framework** | **NestJS** (`@nestjs/common` ~10.4, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/websockets`, etc. in `apps/api/package.json`). |
| **Frontend framework** | **React 18** + **Vite 5** + **TypeScript**; styling via **Tailwind CSS 4**; data via **TanStack React Query**; routing via **`react-router-dom`** (also **`@tanstack/react-router`** is listed as a dependency). |
| **Database** | **PostgreSQL** with **Prisma** (`@prisma/client` ^6.7; `datasource db { provider = "postgresql" }` in `packages/database/prisma/schema.prisma`). |
| **Current authentication library** | **Custom auth** (not Passport, not NextAuth): **`jose`** (`SignJWT` / `jwtVerify`) for **access JWTs** (`apps/api/src/auth/jwt-access.service.ts`), **`bcryptjs`** for password hashes, **opaque refresh tokens** persisted in **`RefreshToken`** (Prisma) and delivered via **HTTP-only cookies**; CSRF double-submit for refresh (`apps/api/src/auth/auth.nest.controller.ts`). |

---

## 2. OAuth providers checkboxes (Google, GitHub, etc.) — integrated vs planned

Check only what the code and env contracts in **this snapshot** support.

- [x] **Google** — **Integrated in the API**: `GET /api/v1/auth/google` and `GET /api/v1/auth/google/callback`, `GoogleOAuthService` (`apps/api/src/auth/google-oauth.service.ts`, `apps/api/src/auth/auth.nest.controller.ts`). Active when **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`** are set (`isConfigured()`). **Prisma `AuthProvider` enum includes `google`** (`packages/database/prisma/schema.prisma`). **`.env.example`** documents optional `GOOGLE_CLIENT_*` keys (see repo root `.env.example`).
- [ ] **GitHub** — **Not found** in API or web (no routes, no env keys, no provider enum value).
- [ ] **Microsoft / Apple / Facebook / Discord / other** — **Not found** in API or web beyond generic docs mentioning “OAuth client ID/secret (if OAuth enabled)” (`docs/agent-ref/ops/env-vars.md`).

---

## 3. What’s currently working: local login seeded, session management, DB user storage, frontend login form

- [x] **Local login (API)** — `POST /auth/login` validates email/password with **bcrypt**, blocks inactive users, blocks **unverified** local users (`EMAIL_NOT_VERIFIED`), issues access JWT + refresh cookie + CSRF cookie (`apps/api/src/auth/auth-session.service.ts`, `auth.nest.controller.ts`).
- [x] **Seeded / demo logins (documented, not automatic)** — **`packages/database/prisma/seed.mjs`** seeds **templates/workspaces**, not user rows. **`docs/agent-ref/ops/local-dev.md`** and **`.env.example`** describe **`pnpm demo:seed-runtime`** (from **repo root** in full monorepo) then accounts such as **`elshaday@collabsphere.app` / `Demo1234!`**, **`kidist@collabsphere.app` / `Demo1234!`**, plus optional Phase 2 users. **Those root scripts are not present in this recovery-only tree** — follow full repo if available.
- [x] **Session management (API)** — Refresh token in **DB** + **cookie**; **`POST /auth/refresh`** rotates session (requires CSRF header + cookie); **`POST /auth/logout`** / **`POST /auth/logout-all`** (`auth.nest.controller.ts`).
- [x] **Session management (web)** — **`localStorage`** key `cs-auth-session` holds **access token** + optional **CSRF** + user snapshot (`apps/web/src/lib/auth-session.ts`); **`credentials: "include"`** on `fetch` (`apps/web/src/api/client/index.ts`); **401** clears session and navigates to **`/login`** (`apps/web/src/app/providers/app-providers.tsx`).
- [x] **DB user storage** — **`User`** model with `passwordHash`, `authProvider`, `isVerified`, relations to **`RefreshToken`**, **`EmailVerificationToken`**, **`PasswordResetToken`**, etc. (`schema.prisma`).
- [x] **Frontend login form** — Routes live in [`apps/web/src/app/routing/app-routes.tsx`](../../apps/web/src/app/routing/app-routes.tsx); login UI in `features/auth/pages/Login.tsx` + `login-form.tsx`; **`login()`** persists session via [`apps/web/src/api/adapters/auth.ts`](../../apps/web/src/api/adapters/auth.ts).

---

## 4. What’s NOT working: registration, OAuth, password reset, email verification, token refresh, other

Interpretation: **gaps for a complete product UX in this tree**, or **not wired on the web**, even when the API exists.

- [x] **Registration session** — Web **`register()`** completes the API call and returns **`Promise<void>`** without establishing a session until the user verifies email and uses **`login()`** (`apps/web/src/api/adapters/auth.ts`).
- [x] **OAuth in the browser (Google start)** — **`OAuthButton`** assigns **`window.location`** to **`{VITE API base}/auth/google`** (`apps/web/src/features/auth/components/oauth-button.tsx`).
- [ ] **Password reset UI** — API exists; web pages exist under `features/auth/pages` — **end-to-end with live SMTP/MailHog** not executed in this doc pass.
- [ ] **Email verification UX** — Depends on **worker + MailHog/SMTP** in dev; not executed here.
- [x] **Access-token refresh on the web** — **`request()`** retries once after **`POST /auth/refresh`** on **`401` + `TOKEN_INVALID` / `TOKEN_EXPIRED`** when a bearer was sent (`apps/web/src/api/client/index.ts`).
- [x] **Other (notable)** — **`SessionAccount.authProvider`** reflects **`AuthSession.user.authProvider`** (`local` \| `google`) from the API (`apps/web/src/lib/auth-session.ts`).

---

## 5. Deployment: dev/staging/production, domain URL if documented

- **Dev** — Documented: Vite **`http://localhost:8080`** / **`127.0.0.1:8080`**, API **`http://127.0.0.1:3001`** (`docs/agent-ref/ops/local-dev.md`, `.env.example` `API_BASE_URL`, `CORS_ORIGINS`).
- **Staging / production** — **`docs/agent-ref/ops/env-vars.md`** names **local, staging, production** as environment types and points to canonical spec paths (`docs/spec/14-devops/...`). **Those spec files are not in this recovery snapshot**; **no production domain URL** was found in the files read (only localhost-style defaults in `.env.example`).
- **BASE_URL mismatch note** — `.env.example` sets **`BASE_URL=http://localhost:3000`** while local-dev emphasizes **8080** for Vite; treat as **“configure per actual web port”** for local.

---

---

## Phase 0 discovery (automated)

See [oauth-auth-phase0-discovery.md](./oauth-auth-phase0-discovery.md) for file lists and auth route decorators.

## Phase 1 checklist

See [oauth-auth-phase1-checklist.md](./oauth-auth-phase1-checklist.md).

## Schema deferrals

See [oauth-auth-schema-deferred.md](./oauth-auth-schema-deferred.md).
