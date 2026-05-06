# Pre-Push Validation

## Purpose
Prevent the "push first, let CI tell us later" failure mode.

## When to Use
- Before every push
- Before requesting review
- Before marking a non-trivial task complete

## Required Validation
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`

All three must be green locally unless the task handoff explicitly
states why a command could not run.

## Enforcement
- Prefer automated enforcement via a pre-push hook when it lands.
- CI is a backstop, not the first place to discover obvious failures.
- Red local validation is a process failure, not routine noise.

## Dangerous Mistakes
- Pushing on the assumption that untouched tests do not matter
- Treating skipped local validation as acceptable without a written
  reason
- Claiming completion with no evidence

## Related Skills / References
- `core/session-continuity.md`
- `docs/architecture/current-state.md`
