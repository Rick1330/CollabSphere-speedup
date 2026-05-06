# Documents Context Bundle

## Purpose
Starting context for document tree, editor surface, comments rail,
versions, submissions, and collab-aware document behavior.

## Read First
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/collab/AGENTS.md`
- `docs/architecture/current-state.md`

## Primary code surfaces
- `apps/web/src/features/documents/*`
- `apps/collab/*`
- `packages/database/prisma/schema.prisma` (document-related models)

## Primary spec / execution references
- `docs/spec/05-features/05.3-templates.md`
- `docs/spec/05-features/05.4-documents.md`
- `docs/spec/04-user-flows/04.6-document-collaboration.md`
- `docs/spec/10-realtime/*`
- `docs/domains/templates/*`
- `docs/agent-ref/collab/*`

## Current implementation reality
- Frontend document/editor surfaces are broad and visually meaningful.
- Collaboration direction is clear, but production-hardening and exact
  runtime completeness must not be assumed.
- The document surface is one of the primary product differentiators and
  should be treated as a high-trust area.

## Common risks
- Leaking canonical document content through REST
- Treating plaintext derivatives as source of truth
- Building editor UI that ignores collaborative or read-only rules
- Letting template ambition outpace real editor capabilities

## Validation focus
- `docs/ai/skills/validation/ui-contract.md`
- `docs/ai/skills/validation/performance.md`
- `docs/ai/skills/validation/permissions.md`

## Open questions to respect
- Advanced structured blocks, export quality, and deeper academic
  document behavior are still staged arcs
- File uploads remain a dependency for the richer document experience
