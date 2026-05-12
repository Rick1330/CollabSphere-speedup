# Drift Detection
## Purpose
Detect when code diverges from documented architecture before building on top of the divergence.
## When to Use
- Before starting implementation of a documented rule or framework.
- When existing code appears to follow a different pattern than the docs prescribe.
## Required Inputs
- Relevant `AGENTS.md`
- `docs/architecture/current-state.md`
- `package.json`
- Configuration files (e.g., `tsconfig.json`, NestJS modules)
## Workflow
1. Before implementing, read the relevant `AGENTS.md`.
2. Verify prerequisites exist (grep `package.json` for frameworks, check config files).
3. If rule says "use X" and X is not present (e.g., "use NestJS" but no NestJS is installed), STOP.
4. Log discrepancy in `docs/audit/agents-open-questions.md`.
5. Propose a precondition story instead of implementing a hand-rolled workaround.
## Dangerous Mistakes
- Approximating a missing framework with hand-rolled code.
- Ignoring documentation that contradicts the current state of the repo without flagging it.
## Validation Expectations
- The implementation must align with the repository's technology stack as defined in its configuration.
