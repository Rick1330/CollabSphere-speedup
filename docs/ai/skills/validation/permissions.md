# Permissions Validation
## Purpose
Verify that authorization rules are strictly enforced and do not leak data across workspace boundaries (IDOR prevention).
## Universal Checklist per Endpoint
- [ ] **Unauthenticated**: Returns `401 UNAUTHORIZED`.
- [ ] **Cross-Workspace Access**: Authenticated member of Workspace A attempts to access resource in Workspace B. Returns `404 NOT_FOUND` (preferred for IDOR) or `403 NOT_WORKSPACE_MEMBER`.
- [ ] **Insufficient Role**: Member with `VIEWER` role attempts to perform a `MANAGER+` action. Returns `403 INSUFFICIENT_PERMISSIONS`.
- [ ] **Soft-Deleted User**: User account is deactivated or deleted. Blocked from all actions.
- [ ] **Archived Workspace**: Archive status blocks all write actions but allows reads.
- [ ] **Deactivated Membership**: User is still in the DB but their membership is marked `isActive: false`. Returns `403 NOT_WORKSPACE_MEMBER`.
- [ ] **Resource-Level Guard**: Specific document or task lock prevents mutation by non-locker.
## Dangerous Mistakes
- Trusting client-supplied IDs without verifying they belong to the authenticated user's active workspace.
- Using `findUnique` without a `workspaceId` filter.
