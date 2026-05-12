# Collab Testing Rules
## Integration Scaffold
- Tests must use `yjs` and `@hocuspocus/transformer` or a test client to simulate real WebSocket activity.
- Ephemeral PostgreSQL and Redis instances are preferred for clean test state.

## Convergence Patterns
- Scenario: Two clients edit the same paragraph simultaneously.
- Expectation: After 5 seconds, both clients have identical binary state, and the DB reflects the merged content.

## Auth Boundary Tests
- Reject connection if JWT has invalid `workspaceId`.
- Force `readOnly: true` if doc becomes locked during an active session.
- Disconnect user if their membership is removed mid-edit.
