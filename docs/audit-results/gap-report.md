# Detailed Gap Report: CollabSphere Backend Quality Audit

This report identifies feature gaps, broken rules, and quality deficiencies in the current NestJS backend implementation compared to the canonical specifications and senior engineering standards.

---

## 1. Overview
The migration to NestJS is ~70% complete in terms of controller/service scaffolding, but ~30% complete in terms of production-readiness. While most domain modules exist, they suffer from inconsistent validation patterns, missing security guards, and a lack of integrated testing.

---

## 2. Core Architecture & Infrastructure Gaps

### 2.1 The "Double Runtime" Debt
- **Status**: Critical Deficiency.
- **Gap**: Both `apps/api/src/main.ts` (NestJS) and `apps/api/src/dev.ts` (Legacy Bootstrap) exist. Some features (like `register` and `verify-email`) are duplicated.
- **Risk**: Drift between the two runtimes. Developers might update logic in one and forget the other. Production parity is unverified.

### 2.2 Shared Configuration & Secret Management
- **Status**: Moderate Deficiency.
- **Gap**: `apps/collab` and `apps/worker` rely on separate `.env` parsing logic or duplicated constants.
- **Requirement**: Move shared configuration, environment schemas, and secret resolution into `packages/shared`.

### 2.3 Database Transaction Integrity
- **Status**: Qualitative Gap.
- **Gap**: While `DocumentsService` uses transactions for content updates and versions, other services (e.g., `TasksService`, `WorkspacesService` members) sometimes perform multi-step writes without a formal transaction, risking orphaned records or inconsistent activity logs.

---

## 3. Module-by-Module Audit

### 3.1 Auth & Users
- **Gaps**:
  - `GET /auth/google` and `GET /auth/google/callback` are implemented but lack E2E verification.
  - `PUT /users/me/avatar` endpoint is missing from `UsersNestController`.
  - CSRF protection relies on a manual check in the controller rather than a global NestJS guard/interceptor.
- **Rule Violations**: None found, but JWT rotation and refresh token revocation strategies are not fully documented.

### 3.2 Workspaces & Invitations
- **Gaps**:
  - `POST /workspaces/:workspaceId/transfer-ownership` needs stricter verification of the new owner's status.
  - `POST /workspaces/:workspaceId/invitations/:invitationId/revoke` is marked as optional in the spec but is critical for security.
- **Isolation**: `WorkspaceMembershipGuard` is correctly applied to most endpoints, but global `WorkspacesNestController` (listing all workspaces) needs to ensure it doesn't leak metadata of archived/deleted workspaces.

### 3.3 Documents & Folders
- **Gaps**:
  - `DocumentsService` content update logic for required blocks is implemented but the `blockTypes` array from the frontend is trusted without deep validation against the Yjs state.
  - `POST /documents/:documentId/export` is implemented in `ExportsService` but the worker side (`apps/worker`) is not yet producing actual PDF/Markdown artifacts (stubbed).
- **Rule Violations**: Inconsistent validation (manual `validateCreatePayload` vs. `class-validator` in Tasks).

### 3.4 Tasks & Linking
- **Gaps**:
  - `Task ↔ Document Links` endpoints (`GET /tasks/:taskId/links`) are missing from `TasksNestController`.
  - Bulk task operations (`POST /tasks/bulk`) are missing.
- **State Machine**: `TASK_TRANSITIONS` is defined in `TasksService`, but the UI might allow illegal moves if the controller doesn't strictly enforce them via the service.

### 3.5 Notifications, Activity, and Search
- **Gaps**:
  - `NotificationsService` unread count and mark-all-read are implemented, but real-time push via Socket.IO is partially wired.
  - `SearchService` uses basic `contains` queries. Spec requires PostgreSQL Full-Text Search (`tsvector`) for performance and relevance ranking.
  - No background job for search index refreshing or plaintext derivation from Yjs binary.

---

## 4. Realtime & Background Jobs

### 4.1 Socket.IO (Realtime App Events)
- **Status**: Partial.
- **Deficiency**: `RealtimeGateway` exists but lacks a Redis adapter for horizontal scaling (scaffolded but not tested in multi-node).
- **Broken Rule**: Auth tokens for Sockets are checked once on connection. No logic for mid-session token expiry handling.

### 4.2 Hocuspocus (Realtime Collaboration)
- **Status**: Qualitative Gap.
- **Deficiency**: `onStoreDocument` persists the entire document on every flush (debounce 2.5s). For large documents, this creates massive DB pressure.
- **Missing**: Incremental updates or diff-based persistence logic.

### 4.3 BullMQ (Worker Infrastructure)
- **Status**: Production Blocker.
- **Deficiency**: `apps/worker/src/dev.ts` manually polls or uses simple timers.
- **Requirement**: Full migration to BullMQ with defined retries, DLQs, and worker monitoring.

---

## 5. Security & Isolation
- **Inviolable Rule**: "Workspace isolation is absolute."
- **Observation**: `WorkspaceMembershipGuard` is used, but some queries in `findMany` across services still lack explicit `workspaceId` filters in the `where` clause, relying on the guard for entry but not for data fetching (risking IDOR if the guard is bypassed).
- **Correction**: Every Prisma query targeting a workspace-scoped resource MUST include `workspaceId` in the `where` object.

---

## 6. API Standards & Error Handling
- **Response Envelope**: Mostly followed via `wrapSuccessResponse`.
- **Error Codes**: `AppError` and `CanonicalErrorCode` system is strong.
- **Issue**: Some NestJS controllers throw raw `ValidationAppError` while others let `ValidationPipe` throw standard `BadRequestException`. These should be unified to return the CollabSphere error envelope.

---

## 7. Testing & Verification Gaps
- **Status**: Major Deficiency.
- **Gap**: No automated E2E tests for the NestJS controllers.
- **Missing**:
  - Integration tests for Auth flows (login/refresh).
  - Collab convergence tests (two clients, one Yjs doc).
  - RBAC scenario matrix tests (Viewer trying to lock a document).

---

## 8. Senior Engineer Questions & Resolutions

### 8.1 Is `DocumentsNestController` logic for state transitions production-ready?
**Resolution**: No. While the logic is sound (snapshots on transition), it lacks:
1. Formal database locks during the transition to prevent race conditions.
2. Proper integration with the Notification system (Supervisor should get a notification on submission).
3. Verification of `requiredBlockTypes` against the actual Yjs binary state rather than the plaintext representation.

### 8.2 Are collab and worker apps sharing secrets/infra correctly?
**Resolution**: Partially. They share the database and secret keys via environment variables, but they lack a unified infrastructure library. This leads to duplication of Prisma Client providers and logger setups.

### 8.3 Which legacy features from `dev.ts` are missing their NestJS equivalents?
**Resolution**:
- `GET /api/v1/pagination/fixtures` (Used for testing frontend pagination).
- Full `HealthModule` parity (NestJS version exists but needs alignment with the specific checks in `dev.ts`).

### 8.4 [NEW] Why the inconsistency in validation patterns?
**Question**: We see `class-validator` DTOs in `TasksNestController` but manual validation methods like `validateCreatePayload` in `DocumentsNestController`.
**Impact**: Brittle code and inconsistent error responses.
**Action**: All controllers must move to `class-validator` DTOs with a global validation pipe.

### 8.5 [NEW] How is Socket.IO scaling handled?
**Question**: `RealtimeGateway` does not currently use the Redis adapter in a way that supports sticky sessions or cross-node broadcasting.
**Action**: Implement `RedisIoAdapter` properly and document the "Sticky Session" requirement for the load balancer.
