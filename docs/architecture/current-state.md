# Current State

## Last updated
2026-05-06

## Purpose
This is the living repo-state document for CollabSphere.

It is not a marketing summary.
It records what is actually present in the repository, where the
architecture still diverges from the intended target, and which
questions should be answered before more work compounds on top.

## What is deployed
- Deployment workflows and bootstrap scripts exist for Vercel, Azure
  Container Apps, AWS ECS, and Cloudflare R2 bootstrap paths.
- Live environment status was **not** re-verified in this documentation
  pass.
- Treat deploy state as "defined in repo, operational status requires
  separate verification."

## What is actually built

### Backend (`apps/api`)
- Runtime is still a TypeScript bootstrap application, not a landed
  NestJS module tree.
- Auth and health surfaces exist in code:
  - `src/auth/*`
  - `src/health/*`
- Common concerns already exist as reusable layers:
  - request correlation
  - pagination
  - response envelopes
  - error sanitization
  - Prisma wrappers and workspace-scope helpers
- Validation/testing currently uses direct TypeScript test execution and
  targeted e2e-style checks, not a fully migrated backend test stack.

### Frontend (`apps/web`)
- Vite + React + TypeScript + Tailwind 4 + Radix/shadcn primitives.
- TanStack Query is present.
- Broad feature surfaces are scaffolded:
  - auth
  - dashboard
  - documents
  - files
  - tasks
  - templates
  - review
  - notifications
  - members
  - analytics
  - admin
  - activity
- Much of the frontend still relies on adapter/mocked-state patterns and
  should not be treated as proof that every backend contract is wired.

### Collab (`apps/collab`)
- Dedicated package exists with local AGENTS guidance and bootstrap
  scripts.
- Hocuspocus/Yjs direction is documented, but the package should still
  be treated as a guarded bootstrap surface rather than a fully complete
  production collaboration server.

### Worker (`apps/worker`)
- Dedicated package exists.
- Worker direction is documented, but BullMQ-style production job
  wiring should still be treated as incomplete until verified by story.

### Database (`packages/database`)
- Prisma schema exists and is significantly more complete than many
  higher-level implementations.
- Initial migrations are present.
- The schema is ahead of some runtime surfaces.

### Shared / UI Packages
- `packages/shared` centralizes environment/runtime/constants support.
- `packages/ui` exists with owned primitives.

## Known divergences (spec versus code or target architecture)
- Repo identity and docs target a NestJS API architecture, but
  `apps/api` is not yet a full NestJS application.
- Realtime/collab direction is documented more completely than the
  currently verified runtime implementation.
- Frontend feature breadth is ahead of confirmed backend integration
  depth.
- Some policy and operating assumptions in docs reflect the target
  system rather than a fully validated live stack.

## Documented implementation overrides
- Verify-email token mappings are intentionally documented as local
  overrides in `docs/adrs/0003-verify-email-token-http-mapping.md`.

## Open questions / unresolved
- Exact live staging and production deployment state
- Production approval workflow specifics
- Backup retention policy and runbook completeness
- Connection-pooling strategy beyond defaults
- Real collab rollout criteria and kill-switch expectations
- File-upload hardening sequence relative to editor depth

## Known broken / paused / not yet verified
- Full NestJS migration is not landed
- Full BullMQ worker wiring is not verified
- Full Hocuspocus production hardening is not verified
- End-to-end frontend-to-backend feature wiring is incomplete across
  many surfaces
- Coverage reporting and broader validation discipline are still behind
  the spec ambition

## Foundation work still considered critical
1. NestJS migration / API architecture convergence
2. Backend validation/test-runner hardening
3. Session continuity and governance discipline
4. Observability bootstrap
5. CI and pre-push enforcement hardening
6. Database safety and operational runbooks

## What every agent should read first
1. This file
2. `AGENTS.md`
3. Module-local `AGENTS.md` for the touched surface
4. The most recent file in `docs/ai/sessions/`
5. Relevant domain bundle from `docs/ai/bundles/`
6. Relevant ADRs in `docs/adrs/`

## Maintenance rule
Update this file whenever one of these changes:
- the primary runtime architecture
- the live deployment story
- the list of known divergences
- the top-of-stack foundation priorities
