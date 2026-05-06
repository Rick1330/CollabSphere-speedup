# Permissions Validation

## Purpose
Validate role and workspace-boundary behavior consistently across
surfaces.

## Universal Checklist Per Endpoint Or Action
- [ ] Unauthenticated access returns `401`
- [ ] Authenticated non-member returns `403 NOT_WORKSPACE_MEMBER`
- [ ] Insufficient role returns `403 INSUFFICIENT_PERMISSIONS`
- [ ] Soft-deleted or deactivated user cannot act
- [ ] Archived workspace blocks writes
- [ ] IDOR-style wrong-resource access does not leak cross-workspace
      data
- [ ] Realtime joins enforce the same effective permissions as REST

## Evidence To Capture
- Explicit negative-path tests or manual checks
- Any intentional exceptions documented by ADR
