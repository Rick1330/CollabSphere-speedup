# Workspaces Context Bundle

## Purpose
Fast-start context for workspace lifecycle, memberships, invitations,
settings, and role-driven workspace governance.

## Read First
- `AGENTS.md`
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/current-state.md`

## Primary code surfaces
- `apps/web/src/features/workspace/*`
- `apps/web/src/features/members/*`
- `apps/web/src/app/shell/workspace-switcher.tsx`
- `packages/database/prisma/schema.prisma` (workspace-related models)

## Primary spec / execution references
- `docs/spec/05-features/05.2-workspaces.md`
- `docs/spec/02-personas-roles/*`
- `docs/spec/04-user-flows/04.4-workspace-creation.md`
- `docs/spec/04-user-flows/04.5-workspace-invitation.md`
- `docs/domains/workspaces/*`
- `docs/agent-ref/rules/workspace-isolation.md`

## Current implementation reality
- The workspace system is one of the strongest repo surfaces.
- Role model, invitation flow, workspace settings, and governance docs
  are deeper and more coherent than most other product areas.
- Frontend coverage is broader than many surfaces, but larger-workspace
  governance additions still remain open.

## Common risks
- Membership/offboarding logic drifting between UX and policy
- Confusing global admin concerns with workspace-scoped governance
- Cross-workspace access leaks through shortcuts or search

## Validation focus
- `docs/ai/skills/validation/permissions.md`
- `docs/ai/skills/validation/ui-contract.md`
- `docs/ai/skills/validation/edge-cases.md`

## Open questions to respect
- Guest-role and group-level expansion remain future-facing
- Audit depth and workspace analytics are still evolving surfaces
