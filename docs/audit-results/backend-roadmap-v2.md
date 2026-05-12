# Comprehensive Quality Roadmap v2: CollabSphere Backend

This roadmap supersedes the previous "prioritized" plan. It focuses on closing quality gaps, enforcing rules, and achieving true production readiness through a multi-phase, sprint-based execution.

---

## Phase 0: Foundations & Standardization (Sprints 1-3)
**Goal**: Unified architecture, strict validation, and security enforcement.

### Sprint 1: Validation & Standards Unification
- **Tasks**:
  - Migrate all controllers (`Documents`, `Workspaces`, `Invitations`) to `class-validator` DTOs.
  - Remove manual `validatePayload` methods.
  - Align `HealthNestModule` with legacy `dev.ts` checks.
  - Implement a global `StandardResponseInterceptor` to ensure every success response (even those from 3rd party libs) follows the CollabSphere envelope.
- **Outcome**: Consistent API contract and error shapes.

### Sprint 2: Security Hardening & Isolation
- **Tasks**:
  - Audit all Prisma queries: ensure `workspaceId` is present in every `where` clause for scoped resources.
  - Implement `CsrfGuard` globally using the double-submit cookie pattern.
  - Add `mid-session revocation` logic to `JwtAuthGuard` (checking against a Redis blacklist/session store).
  - Move common guards (`JwtAuthGuard`, `WorkspaceMembershipGuard`) to a dedicated `packages/api-security` if scale justifies it, otherwise keep in `common`.
- **Outcome**: Inviolable workspace isolation and hardened authentication.

### Sprint 3: Shared Infra & Secret Management
- **Tasks**:
  - Create `packages/config-schema` to centralize environment validation for API, Collab, and Worker.
  - Refactor `apps/collab` and `apps/worker` to use the shared config package.
  - Unify Prisma Client instantiation to prevent "too many connections" in dev environments.
- **Outcome**: Dry infrastructure and reliable secret propagation.

---

## Phase 1: Realtime & Persistence Integrity (Sprints 4-6)
**Goal**: Scalable collaboration and bulletproof background processing.

### Sprint 4: Hocuspocus Optimizations
- **Tasks**:
  - Implement incremental persistence for Yjs documents (storing only diffs to a `DocumentUpdate` table).
  - Add a background job to compact updates into the main `content_yjs` blob periodically.
  - Implement `onStoreDocument` verification of mandatory blocks against the Yjs binary state.
- **Outcome**: Reduced database pressure and strict template enforcement.

### Sprint 5: Socket.IO Scaling & Reliability
- **Tasks**:
  - Fully enable `RedisIoAdapter` and verify cross-node event broadcasting.
  - Implement "Presence Sync" between Hocuspocus (doc level) and Socket.IO (workspace level).
  - Add heartbeats and automatic reconnection logic documentation for the frontend.
- **Outcome**: Horizontally scalable real-time events.

### Sprint 6: BullMQ Migration
- **Tasks**:
  - Replace all `setInterval` / manual polling in `apps/worker` with BullMQ processors.
  - Define retry strategies, backoff policies, and Dead Letter Queues (DLQ) for:
    - Email delivery.
    - Document exports (PDF/Markdown).
    - Search index refreshing.
- **Outcome**: Resilient background job architecture.

---

## Phase 2: Feature Completion & Search Depth (Sprints 7-9)
**Goal**: Closing functional gaps and adding professional-grade search.

### Sprint 7: Missing Endpoints & Polish
- **Tasks**:
  - Implement `PUT /users/me/avatar` (with S3/MinIO integration).
  - Implement `POST /workspaces/:workspaceId/invitations/:invitationId/revoke`.
  - Implement `GET /tasks/:taskId/links` and linking logic.
  - Implement basic `Tasks Bulk` operations (P2).
- **Outcome**: API parity with the canonical index.

### Sprint 8: Professional Search (Postgres FTS)
- **Tasks**:
  - Migrate `SearchService` to use PostgreSQL `tsvector` and `tsquery`.
  - Add weighted search (Title > Description > Content).
  - Implement a worker job to derive `content_plaintext` from Yjs binary on every document save.
- **Outcome**: High-performance, relevant search results.

### Sprint 9: Document Export Pipeline
- **Tasks**:
  - Implement actual PDF generation in `apps/worker` using Playwright or a dedicated library.
  - Implement Markdown export using ProseMirror serialization.
  - Wire the `ExportsNestController` to return signed URLs for generated artifacts.
- **Outcome**: Functional document export feature.

---

## Phase 3: Verification & Cutover (Sprints 10-12)
**Goal**: 100% confidence and retirement of legacy code.

### Sprint 10: Integration & E2E Testing
- **Tasks**:
  - Write E2E tests for the full Auth lifecycle (Register -> Verify -> Login -> Refresh).
  - Write RBAC scenario tests (e.g., "Viewer cannot delete document").
  - Implement a "Collab Convergence" test suite.
- **Outcome**: Verified production-readiness.

### Sprint 11: Performance & Security Sweep
- **Tasks**:
  - Run load tests against `Socket.IO` and `Hocuspocus`.
  - Perform an OWASP baseline scan on the NestJS API.
  - Audit logs for PII (ensuring no secrets/tokens are logged).
- **Outcome**: Hardened and performant system.

### Sprint 12: Legacy Retirement (The "Cutover")
- **Tasks**:
  - Switch the main `dev` and `start` scripts to point exclusively to the NestJS runtime.
  - Delete `apps/api/src/dev.ts`.
  - Perform a final drift check between `docs/spec` and implementation.
- **Outcome**: Clean, modular-monolith architecture.
