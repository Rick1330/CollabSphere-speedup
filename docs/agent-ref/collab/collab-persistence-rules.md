# Collab Persistence Rules
## Persistence Trigger
- Persist binary state to `documents.content_yjs` on:
  - Client disconnect (flushing pending stores).
  - Every 2.5 seconds (debounced) during active editing.

## Snapshot Policy
- Every 10 minutes (or after 1000 operations), create a new record in `DocumentVersion`.
- Versions should be tagged with `reason: 'collab_sync'`.

## Failure Handling
- If persistence fails (DB error), retry twice with exponential backoff.
- If it continues to fail, alert the system and optionally transition the document to read-only to prevent further data loss.
- Logs must capture `documentId` and `lastContext.userId`.
