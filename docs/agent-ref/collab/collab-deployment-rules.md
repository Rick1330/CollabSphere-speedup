# Collab Deployment Rules
## Graceful Draining
- On deployment of a new collab server version, existing connections should be "drained" over 60 seconds.
- Clients will auto-reconnect to the new instance.

## Connection Routing
- Currently: single-instance vertical scaling.
- Future (Horizontal): sticky routing by `documentId` via Redis adapter.

## State Recovery
- On server restart, documents are loaded on-demand in the `onLoadDocument` hook using the last persisted `content_yjs` from Postgres.

## Migration Safety
- Never change the Yjs document structure in a way that is backward-incompatible with active editing sessions.
- Use feature flags for protocol version changes.
