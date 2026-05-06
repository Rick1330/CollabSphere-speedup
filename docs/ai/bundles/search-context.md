# Search Context Bundle

## Purpose
Starting context for workspace/global search, search indexing, and the
command/discovery layer around results.

## Read First
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/current-state.md`
- `docs/ai/skills/guardrail/search-indexing.md`

## Primary code surfaces
- search-related frontend shell and command surfaces under
  `apps/web/src/app/shell/*`
- search docs and schema references

## Primary spec / execution references
- `docs/spec/04-user-flows/04.10-search.md`
- `docs/domains/search/*`
- `docs/agent-ref/rules/workspace-isolation.md`

## Current implementation reality
- Search architecture is better documented than many repo surfaces.
- The search experience should be treated as privacy-sensitive and
  permission-sensitive by default.
- Search breadth and result quality remain areas where docs can outpace
  frontend/backed delivery if changes are made casually.

## Common risks
- Cross-workspace leakage
- Logging raw queries or other sensitive search context
- Search UI promising filters or result types the backend does not yet
  support

## Validation focus
- `docs/ai/skills/validation/api-contract.md`
- `docs/ai/skills/validation/permissions.md`
- `docs/ai/skills/validation/performance.md`
