# Phase 0 Test Strategy Reset

Generated at: 2026-05-09T14:19:03.581Z

## Minimum gates
- Contract: `tests/phase0/test-strategy-minimum-gates.json`
- Static safety checks: `tests/unit/phase0-guardrails.test.ts`
- CI contract checks: `tests/unit/phase0-test-strategy-gates.test.ts`

## CI wiring
- Unit-test job executes `pnpm run phase0:guardrails`.
- Standard pipeline retains lint/typecheck/build/integration gates.
