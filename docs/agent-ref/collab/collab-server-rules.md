# Collab Server Rules
## Token Contract
- The REST API (`apps/api`) issues short-lived collaboration tokens (JWT).
- The Collab server (`apps/collab`) validates these tokens in the `onAuthenticate` hook.
- Tokens MUST be scoped to a single `documentId` and `workspaceId`.

## Auth Hook Policies
- Rejection reasons:
  - Token expired or invalid signature.
  - User not a member of the workspace.
  - Workspace archived (reconnect as read-only).
  - User account deactivated.

## Workspace Boundaries
- Every database query in Hocuspocus hooks MUST include both `workspaceId` and `documentId`.

## Read-Only State
- Enforcement:
  - If a document is locked by another user, the server must force the current connection to `readOnly: true`.
  - If a document status is not `draft` or `changes_requested`, it is read-only for most roles.
