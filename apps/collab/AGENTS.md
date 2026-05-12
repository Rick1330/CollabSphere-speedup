# AGENTS.md (apps/collab)
## Purpose
Local rules for the Hocuspocus collab server.

## Scope
`apps/collab` — WebSocket server, Yjs document persistence, awareness, auth.

## Inviolable
- Document content source-of-truth is Yjs binary state.
- REST never returns Yjs state (already enforced repo-wide).
- Workspace membership re-validated at every connect.
- Auth tokens are short-lived (≤ 5 minutes) and scoped to single document.
- Soft-deleted users cannot connect.
- Archived workspaces are read-only via collab.
- Locked documents reject mutation attempts (server-enforced).
- Per-keystroke activity events are forbidden (already repo-wide rule).

## Strong defaults
- Hocuspocus extension hooks own the policy (`onAuthenticate`, `onConnect`, `onChange`, `onStoreDocument`, `onDisconnect`).
- Use the database extension for Postgres persistence.
- Persist on disconnect; snapshot every 10 minutes (or on major activity).
- Reject malformed Yjs updates; do not accept binary blobs from clients without validation.

## Never do
- Trust client-supplied user IDs; resolve from auth token only.
- Read other workspaces' documents from any hook.
- Hold connections open after auth expiry without re-validation.
- Skip persistence on disconnect (prevention of data loss).

## Tests / validation
- Integration tests for: connect with valid token, reject invalid token, multi-client convergence, persistence on disconnect, soft-deleted user rejection, archived workspace read-only.
- No mocking Hocuspocus internals; spin up a real server instance against an ephemeral Postgres for integration tests.

## References
- `docs/agent-ref/collab/collab-server-rules.md`
- `docs/agent-ref/collab/collab-persistence-rules.md`
- `docs/agent-ref/collab/collab-deployment-rules.md`
- `docs/agent-ref/collab/collab-testing-rules.md`
- `docs/spec/10-realtime/*` (canonical spec)
- `packages/database/prisma/schema.prisma` (`Document`, `DocumentVersion` models)
