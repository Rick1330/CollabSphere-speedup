# Current State
## Last updated: 2026-05-12
## What's deployed
- **Staging**: `api`, `collab`, `worker`, `web` (web on Vercel)
- **Production**: NOT YET PROVISIONED

## What's actually built
### Backend (`apps/api`)
- **Runtime**: NestJS (target) with legacy `node:http` bootstrap remaining as fallback.
- **Endpoints**: Health, Auth (Register, Verify-Email, Login, Refresh, Logout, Logout-All, Resend-Verification, Forgot-Password, Reset-Password, Google OAuth, Collab-Token), Workspaces, Invitations, Documents (List, Tree, Get, Create, Metadata, Content, Delete, Lock, Unlock, Versions, Restore, Submissions), Folders (Create, Rename, Delete), Tasks (List, Get, Create, Update, Assign, Status, Delete), Comments (List, Create, Update, Delete, Resolve), Notifications (Count, List, Mark-Read, Mark-All-Read, Preferences), Search (Workspace-scoped), Admin (Overview, Users, Workspaces, Audit).
- **Test Runner**: Node:test and Vitest (inconsistent).
- **Tests**: ~130 passing.

### Frontend (`apps/web`)
- Vite + React + TypeScript + Tailwind 4 + shadcn/ui
- Single router (RR-DOM v6)
- All feature slices scaffolded with mock adapters.
- Backend integration: WIRED for major flows (Auth, Workspaces, Documents, Tasks).
- Tests: ~90 passing (Vitest).

### Worker / Collab
- **Worker**: BullMQ integrated for Exports and Task Reminders. Legacy verification-email processor exists.
- **Collab**: Hocuspocus 2.x server with JWT handshake and Postgres persistence.

### Database
- **Prisma Schema**: Complete for v1.
- **Migrations**: ~4 applied.
- **Seed**: Basic seeds exist.
- **Coverage**: NOT MEASURED.

## Known divergences (spec ↔ code)
- Spec says supertest integration for all, code has partial coverage.
- TOKEN_INVALID returns 400 on `/verify-email` (override of catalog 401).
- TOKEN_EXPIRED returns 410 on `/verify-email` (override of catalog 400).

## Open questions / unresolved
- Production deploy approval workflow (manual vs tag-gated).
- Backup retention setting (undocumented).
- Connection pooling strategy (defaults only).

## Known broken / paused
- Resend verification email (deferred).
- Frontend → real backend integration for Notifications and Activity (partially wired).

## Foundation stories (in flight)
1. NestJS migration completion.
2. Validation & Standards Unification (move all to `class-validator`).
3. Security Hardening & Isolation (explicit `workspaceId` filters).
4. Shared Infra & Secret Management.

## What every agent should read first
- This file
- `AGENTS.md` (root)
- `AGENTS.md` for affected module
- `docs/ai/sessions/` — most recent entry
- `docs/adrs/` — list of titles
