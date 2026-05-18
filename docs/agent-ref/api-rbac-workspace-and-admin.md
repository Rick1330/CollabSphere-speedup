# API RBAC: workspace membership and platform admin

This document describes the NestJS guard and decorator layer for workspace-scoped routes and `/admin` routes (as implemented in `collabsphere-repo-recovery`).

## Global guard order

Registered in `apps/api/src/app.module.ts`:

1. `CollabThrottlerGuard`
2. `JwtAuthGuard` — authentication; `@Public()` skips JWT
3. `WorkspaceMembershipGuard` — runs when route params include `workspaceId`
4. `GlobalRolesGuard` — runs when metadata `globalRole` is set (e.g. admin routes)
5. `CsrfGuard`

## WorkspaceMembershipGuard

**File:** `apps/api/src/common/guards/workspace-membership.guard.ts`

If there is no `workspaceId` route param, the guard returns `true` (no-op). That keeps `/admin`, auth, and list-workspace routes out of workspace membership logic.

When `workspaceId` is present:

1. Load workspace (`deletedAt: null`). Missing → `404` with code `WORKSPACE_NOT_FOUND`.
2. For `POST` / `PUT` / `PATCH` / `DELETE`, if workspace `status === 'archived'` → `403` with code `WORKSPACE_ARCHIVED_READONLY` (before membership lookup).
3. Load active `WorkspaceMember` (`isActive`, not `deletedAt` / `leftAt`), including `user.fullName` for snapshot-style use.
4. Compare the caller’s role to optional metadata key `workspaceRole` (decorators `@WorkspaceRoles` / `@WorkspaceRoleAtLeast`). Below minimum → `403` with code `INSUFFICIENT_ROLE`. Hierarchy: `VIEWER` 1 … `OWNER` 5.
5. Attach `req.workspace` and `req.workspaceMember`.

**Platform admin read bypass:** For `GET` / `HEAD` only, if there is no membership but the user’s **database** `User.globalRole` is `ADMIN`, the guard attaches a synthetic `VIEWER` membership so admins can read workspace data without a row in `WorkspaceMember`. Writes still require real membership (or fail at step 2 if archived).

**Prisma:** Uses `PrismaClientProvider` (same role as a dedicated `PrismaService`).

## GlobalRolesGuard

**File:** `apps/api/src/common/guards/global-roles.guard.ts`

- Reads `globalRole` metadata from the handler/class (via `Reflector`).
- When required role is `ADMIN`, loads `User` by `req.user.sub` from the **database** and checks `globalRole === 'ADMIN'`. JWT `globalRole` is not used for this decision.
- Non-admin → `403` with code `FORBIDDEN`.

`@AdminOnly()` in `apps/api/src/common/decorators/admin-only.decorator.ts` sets both the legacy admin flag and `globalRole: 'ADMIN'` so existing admin controllers work with `GlobalRolesGuard`.

## Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Public()` | Skip JWT on a route |
| `@CurrentUser()` | `req.user` (JWT payload) |
| `@CurrentWorkspace()` | `req.workspace` after workspace guard |
| `@CurrentWorkspaceMember()` | `req.workspaceMember` after workspace guard |
| `@WorkspaceRoles(role)` | `SetMetadata('workspaceRole', role)`; alias `@WorkspaceRoleAtLeast` |
| `@GlobalRole('ADMIN')` | `SetMetadata('globalRole', 'ADMIN')` |
| `@AdminOnly()` | Legacy + `globalRole: 'ADMIN'` |

Express augmentation: `apps/api/src/types/express.d.ts` (`workspaceMember` may include `user.fullName`).

## Tests

Unit tests (run with API `tsconfig` so Nest parameter decorators compile):

- `tests/unit/api-workspace-membership-guard.test.ts`
- `tests/unit/api-global-roles-guard.test.ts`

Wired in root `package.json` `test:unit` script alongside `api-jwt-auth-guard-options.test.ts`.

## Web: login page

The dev-only inline demo credential hint was removed from the sign-in UI (`apps/web/src/features/auth/components/login-form.tsx`). Use your own accounts or seed scripts (`pnpm demo:seed-runtime`) per environment docs; do not ship fixed demo passwords in the UI.
