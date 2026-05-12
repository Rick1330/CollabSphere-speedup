# Code Quality Gates
## Purpose
Prevent anti-patterns that CodeScene, Sonar, and DeepScan will flag before they land in the repo.
## Never Ship
- **Cyclomatic Complexity > 9** in any single function.
- **Code Duplication** across ≥3 places without a shared helper or package.
- **`any` Types** in non-test code (must use precise types or `unknown`).
- **`// @ts-ignore`** without a specific, documented explanation of why the type error is unresolvable.
- **Hardcoded IP Addresses** outside of RFC 5737 ranges in tests.
- **Files > 300 Lines** that are not pure configuration or data.
- **Functions > 50 Lines**.
- **Tests against private class fields** (use the `_debugStats` pattern or public interfaces).
- **React Component Complexity > 15**.
- **Nested Ternaries > 2 levels deep**.
- **Dead Code**: unused exports, unused imports, or large blocks of commented-out code.
## Validation
- Run `pnpm lint` and `pnpm typecheck` locally before every commit.
- Use a code-quality tool (like CodeRabbit) as part of the PR process.
