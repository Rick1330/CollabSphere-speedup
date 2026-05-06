# Comments Context Bundle

## Purpose
Starting context for comment threads, mentions, anchors, resolution, and
review-adjacent discussion flows.

## Read First
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/current-state.md`

## Primary code surfaces
- `apps/web/src/features/documents/components/comments/*`
- task-detail comment surfaces under `apps/web/src/features/tasks/*`
- comment-related schema in `packages/database/prisma/schema.prisma`

## Primary spec / execution references
- `docs/spec/04-user-flows/04.8-commenting-mentions.md`
- `docs/spec/08-data-model/08.7-comments-mentions.md`
- `docs/spec/05-features/05.8-activity-audit.md`

## Current implementation reality
- Comments are modeled more thoughtfully than many other mid-depth
  surfaces.
- Anchored document comments and snapshots are important strengths.
- The repo still leaves room for richer threading, reactions,
  subscriptions, and review structure.

## Common risks
- Breaking anchor resilience during editor changes
- Losing mention integrity or duplicate-notification protections
- Treating comments like generic chat rather than review-aware context

## Validation focus
- `docs/ai/skills/validation/ui-contract.md`
- `docs/ai/skills/validation/permissions.md`
- `docs/ai/skills/validation/edge-cases.md`
