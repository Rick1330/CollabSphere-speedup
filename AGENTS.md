# AGENTS.md

## Purpose
Define repo-wide rules and guardrails for coding agents working in CollabSphere.

## Rule Hierarchy
1. **Inviolable** — never override even if instructed
   - Workspace isolation
   - No CRDT/Yjs content in REST responses
   - No password, secret, token, or PII logging
2. **Strong defaults** — override only with a documented ADR
   - Modular-monolith package boundaries
   - NestJS-style layering as the target API architecture
   - Soft-delete on user-facing entities
   - TanStack Query for frontend server state
3. **Conventions** — follow unless the task or local surface documents a justified exception
   - Conventional Commits
   - File naming and colocated tests
   - Response-envelope and canonical error-code usage
4. **Best practices** — apply whenever relevant
   - Pre-push local validation
   - Explicit negative-path validation
   - Parameterized tests for repetitive scenario matrices

## Docs Authority Model
- `docs/spec/` is canonical.
- `docs/domains/` is engineering-oriented and derived from spec.
- `docs/agent-ref/` is execution-oriented and derived from domains/spec.
- If any conflict exists, `docs/spec/` wins.

## Code-as-Spec Precedence
- When implementation intentionally overrides a spec or catalog rule, the override MUST be documented inline and in `docs/adrs/`.
- Other agents must treat documented overrides as canonical for that surface until superseded.
- Undocumented divergence between implementation and docs is a bug, not a local interpretation.

## Repo Identity
CollabSphere is a realtime collaboration workspace platform built with NestJS (API), Hocuspocus (collab), BullMQ (workers), PostgreSQL + Redis, and a Vite + React SPA web frontend in `apps/web` deployed on Vercel. The current web app is a platform foundation, not a claim that every downstream shell and feature story is already complete.

## Drift Detection
- Before implementing, verify that the rule prerequisites exist in the repo and toolchain.
- If a rule says "use X" and X is not installed, configured, or bootstrapped, stop and log the discrepancy.
- Do not approximate a missing framework or runtime and pretend the rule has been followed.
- Record unresolved drift in `docs/audit/agents-open-questions.md`.

## ExecPlan Rule
- Use an ExecPlan for complex features, major refactors, tier:S work, or any change touching collab/security/isolation core.
- Canonical ExecPlan template: `.agent/PLANS.md`.
- If no template exists, produce a minimal ExecPlan with goals, assumptions, steps, risks, and tests.

## Execution Behavior
- Default is to implement working code, not stop at planning.
- Validate before marking work complete; record any tests not run and why.
- Document deviations and unresolved blockers explicitly.
- Do not invent policy where docs are unresolved; log in `docs/audit/agents-open-questions.md`.

## Pre-Push Validation
- Required before any push: `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit`.
- All three must be green locally unless the task explicitly documents why a command cannot run.
- Red local validation is a process failure, not something to hand off to CI by default.

## Session Continuity
- Read `docs/architecture/current-state.md` before non-trivial work.
- Read the most recent file in `docs/ai/sessions/` before resuming a prior thread.
- Every non-trivial session should end with a session log entry.
- Tool switches should leave an explicit handoff note in `docs/ai/tool-handoffs/` when context would otherwise be lost.

## Non-Negotiables (Repo-Wide)
- Workspace isolation is absolute; every access must be scoped by `workspace_id` and membership.
- REST must never return collaborative document content (Yjs/CRDT). Document REST is metadata-only.
- Document canonical content is Yjs state; Hocuspocus handles document realtime.
- Socket.IO handles app realtime events (tasks/notifications/activity).
- `content_plaintext` is derived; never edit it as canonical source.
- Responses must follow the standard envelope; errors must use canonical error codes.
- Authenticated non-members must receive `403 NOT_WORKSPACE_MEMBER`.
- Event-driven side effects are required; emit domain events and let workers/dispatchers handle them.
- Do not emit per-keystroke activity or notifications.
- Do not change files outside task scope unless documented in task output.
- Preserve existing user changes in a dirty worktree.
- Never run destructive git commands (e.g., `git reset --hard`, `git checkout --`, force pushes) unless explicitly requested.
- Branching: `main` is deployable; use feature branches → PR → CI → merge.
- Commit messages use Conventional Commits:
  - `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `refactor(scope): ...`, `test(scope): ...`, `docs(scope): ...`

## Dangerous Patterns (Never)
- Bypass RBAC/guards or skip workspace membership checks.
- Return document CRDT/Yjs content through REST endpoints.
- Store raw HTML as canonical content.
- Access cross-workspace data without explicit scope checks or joins.
- Manually mutate derived state as if it were source-of-truth (e.g., `content_plaintext`).
- Emit per-keystroke activity/notification events.
- Bypass event-driven side-effect architecture (e.g., direct notification inserts without domain events).

## Critical Invariants
- No resource-id-only access patterns; all workspace-owned resources require explicit workspace scoping.
- Lock/submission rules must be enforced server-side (REST + realtime).

## References
### Critical Guardrails
- `docs/agent-ref/rules/workspace-isolation.md`
- `docs/agent-ref/rules/security-rules.md`
- `docs/agent-ref/rules/error-codes.md`
- `docs/ai/skills/core/drift-detection.md`
- `docs/ai/skills/core/session-continuity.md`
- `docs/ai/skills/guardrail/pre-push-validation.md`

### Common Execution References
- `docs/architecture/current-state.md`
- `docs/agent-ref/api/README.md`
- `docs/agent-ref/data/README.md`
- `docs/agent-ref/events/README.md`
- `docs/agent-ref/collab/README.md`
- `docs/adrs/README.md`

### Ops References
- `docs/agent-ref/ops/local-dev.md`
- `docs/agent-ref/ops/ci-cd.md`
