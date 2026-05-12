# Phase 0 Recovery Log

Generated at: 2026-05-09T14:19:03.580Z

## Artifacts
- `phase0-parity-matrix.json`
- `phase0-current-state-architecture.md`
- `phase0-divergence-report.md`

## Guardrails and gates wired in repo
- ESLint restrictions for direct mock imports in production UI code.
- ESLint restriction to prevent feature-level direct fetch usage outside API client.
- Static API workspace-scope/authz guardrail tests in `tests/unit/phase0-guardrails.test.ts`.
- Minimum test strategy gate manifest and CI workflow assertions.
