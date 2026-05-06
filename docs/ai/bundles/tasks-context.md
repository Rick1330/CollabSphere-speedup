# Tasks Context Bundle

## Purpose
Fast-start context for task board/list/detail behavior, document-task
linking, filters, and future planning depth.

## Read First
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/current-state.md`

## Primary code surfaces
- `apps/web/src/features/tasks/*`
- `apps/web/src/api/adapters/tasks.ts`
- `packages/database/prisma/schema.prisma` (task-related models)

## Primary spec / execution references
- `docs/spec/05-features/05.5-tasks.md`
- `docs/spec/05-features/05.6-document-task-linking.md`
- `docs/domains/tasks/*`
- `docs/agent-ref/api/task-endpoints.md`

## Current implementation reality
- Tasks have meaningful UI breadth already: board, list, detail, links,
  and comments.
- The schema and docs are ahead of some deeper planning/runtime
  capabilities like subtasks, cycles, and dependencies.
- Document-task linking is a core product differentiator and should stay
  central.

## Common risks
- Regressing doc-task linking while chasing generic task features
- Overbuilding PM complexity without preserving speed
- Letting frontend state get ahead of actual contract support

## Validation focus
- `docs/ai/skills/validation/ui-contract.md`
- `docs/ai/skills/validation/api-contract.md`
- `docs/ai/skills/validation/edge-cases.md`

## Open questions to respect
- Cycle/milestone/dependency depth is still a staged choice, not a fully
  landed invariant
