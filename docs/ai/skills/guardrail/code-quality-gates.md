# Code Quality Gates

## Purpose
Catch production-quality anti-patterns before they become review churn
or post-merge debt.

## When to Use
- Any implementation change
- Any refactor
- Any review pass focused on maintainability

## Never Ship
- Cyclomatic complexity above 9 in a normal function without strong
  justification
- React component cyclomatic complexity above 15
- Duplication across three or more places without extracting a shared
  helper
- `any` in non-test code without a compelling boundary reason
- `@ts-ignore` without an explanatory comment
- Hardcoded IP addresses outside RFC 5737 ranges in tests
- Non-data files above roughly 300 lines with no justification
- Functions above roughly 50 lines with mixed responsibilities
- Tests that reach into private class state when a debug seam would do
- Deep nested ternaries
- Dead exports, unused imports, or commented-out code left behind

## Workflow
1. Scan touched files for maintainability red flags before finishing.
2. Prefer local simplification while the change is still in hand.
3. If a violation is temporarily unavoidable, document it in the handoff
   and keep scope narrow.

## Validation Expectations
- Run lint and typecheck for touched scopes at minimum.
- Treat dead code and unused imports as real defects, not polish items.

## Escalation Conditions
- A requested change would force structural debt that should instead be
  split into a follow-up refactor

## Related Skills / References
- `guardrail/pre-push-validation.md`
- `implementation/unit-test-writer.md`
