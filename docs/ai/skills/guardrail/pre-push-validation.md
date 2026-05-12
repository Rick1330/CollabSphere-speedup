# Pre-Push Validation
## Purpose
Prevent process violations by ensuring local tests and quality checks pass before code reaches the shared repository.
## Required Before Every Push
1. **`pnpm -w lint`**: MUST be green.
2. **`pnpm -w typecheck`**: MUST be green.
3. **`pnpm test:unit`**: MUST be green (local unit tests for affected packages).
## Enforcement
- Husky pre-push hooks should ideally automate these checks.
- Pushing code that breaks local validation is a process violation and increases CI token costs.
- If a command cannot run (e.g., missing local secrets), it MUST be documented in the handoff.
## Related Skills
- `docs/ai/skills/guardrail/code-quality-gates.md`
