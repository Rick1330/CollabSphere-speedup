# Drift Detection

## Purpose
Detect when the repo’s implementation reality diverges from documented
architecture before new work compounds on top of the drift.

## When to Use
- Before implementing any architecture-sensitive task
- When docs claim a framework or runtime invariant
- When a task references patterns that may not yet exist

## Required Inputs / Context
- Root and local `AGENTS.md`
- Relevant package manifests and config files
- Relevant docs/spec and docs/agent-ref sources

## Read First
- `AGENTS.md`
- Local surface `AGENTS.md`
- Relevant domain bundle in `docs/ai/bundles/`

## Workflow
1. Read the governing docs for the target surface.
2. Verify the prerequisites named by those docs actually exist in the
   repo:
   - package dependencies
   - config files
   - runtime bootstrap
   - file layout
3. If the docs say "use X" and X is absent, stop.
4. Record the discrepancy in `docs/audit/agents-open-questions.md`.
5. Propose the precondition story or update path instead of writing an
   approximation that merely imitates the missing architecture.

## Dangerous Mistakes
- Writing code that copies the naming of a missing framework
- Treating aspirational docs as if they were already landed runtime
- Expanding a workaround into production architecture without recording
  the divergence

## Validation Expectations
- Confirm that the implementation surface still aligns with the docs you
  are relying on.
- If relying on an ADR-based exception, cite the ADR in your handoff.

## Escalation Conditions
- Framework-level mismatch
- Missing package or runtime prerequisite
- Spec and code disagree and no ADR exists

## Related Skills / References
- `core/session-continuity.md`
- `docs/audit/agents-open-questions.md`
- `docs/architecture/current-state.md`
