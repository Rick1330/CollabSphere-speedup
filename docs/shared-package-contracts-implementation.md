# Shared package cross-service contracts — implementation handoff

**Date:** 2026-05-15  
**Plan reference:** `shared_package_contracts` (Cursor plan; do not edit the plan file)  
**Gap guide reference:** `new-rev/CollabSphere_Gap_Analysis_Quality_Guide_v2.md` — Part 0 (Cross-Service Contracts)  
**Repo:** `collabsphere-prj03/collabsphere-repo-recovery`  
**Package:** `@collabsphere/shared`

This document records what was implemented, what was intentionally left unchanged, how to verify it, and what follow-up work belongs in the next task.

---

## 1. Goal

Establish canonical TypeScript contracts in `packages/shared` so API, web, collab, and worker services can share:

- Error codes (`ErrorCodes` / `ErrorCode`)
- Socket.IO event names (`ServerEvents` / `ClientEvents`)
- BullMQ queue and job types (`Queues`, `JobTypes`, payload interfaces)
- HTTP API envelope types (`ApiResponse`, `ApiError`, `PaginationMeta`, `ValidationDetail`)
- Template V2 types (document + workspace templates)

All new const objects use `as const` for literal inference. No `any` in the new contract files.

---

## 2. Pre-implementation audit (summary)

| Requested file | Before | After |
|----------------|--------|-------|
| `error-codes.ts` | **Partial** — codes only in `canonical-constants.ts` as arrays | **Present** — `constants/error-codes.ts` with `ErrorCodes` object (96 keys) |
| `socket-events.ts` | **Missing** — ad hoc strings in web `socket-client.ts` | **Present** — `constants/socket-events.ts` |
| `job-types.ts` | **Missing** — only file-queue helpers under `queues/` | **Present** — `jobs/job-types.ts` |
| `template.types.ts` | **Partial** — slim `types/template-v2.ts` | **Present** — full `types/template.types.ts`; `template-v2.ts` re-exports |
| `api.ts` | **Missing** — web had local envelope parsers | **Present** — `types/api.ts` |

Existing modules **not removed**: `canonical-constants.ts` category arrays, enums, env, collab policies, file-queue `queues/`, `events/auth-events.ts`.

---

## 3. Files created

| File | Purpose |
|------|---------|
| [`packages/shared/src/constants/error-codes.ts`](../packages/shared/src/constants/error-codes.ts) | `ErrorCodes` const object + `ErrorCode` union type |
| [`packages/shared/src/constants/socket-events.ts`](../packages/shared/src/constants/socket-events.ts) | `ServerEvents`, `ClientEvents`, `ServerEventName`, `ClientEventName` |
| [`packages/shared/src/jobs/job-types.ts`](../packages/shared/src/jobs/job-types.ts) | `Queues`, `JobTypes`, job payload interfaces, `JobPayloadByType`, `TypedJob` |
| [`packages/shared/src/types/api.ts`](../packages/shared/src/types/api.ts) | `ApiResponse<T>`, `ApiError`, `PaginationMeta`, `ValidationDetail` |
| [`packages/shared/src/types/template.types.ts`](../packages/shared/src/types/template.types.ts) | Full document + workspace template V2 schema |
| [`tests/unit/shared-socket-job-api-contracts.test.ts`](../tests/unit/shared-socket-job-api-contracts.test.ts) | Contract smoke tests |

---

## 4. Files modified (additive)

| File | Change |
|------|--------|
| [`packages/shared/src/constants/index.ts`](../packages/shared/src/constants/index.ts) | Re-exports `error-codes`, `socket-events` |
| [`packages/shared/src/constants/canonical-constants.ts`](../packages/shared/src/constants/canonical-constants.ts) | `ErrorCode` type re-exported from `error-codes.ts` (arrays unchanged) |
| [`packages/shared/src/types/template-v2.ts`](../packages/shared/src/types/template-v2.ts) | Re-exports only (backward compatibility) |
| [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts) | Exports `template.types`, `api` |
| [`packages/shared/src/index.ts`](../packages/shared/src/index.ts) | Re-exports `jobs/job-types` |
| [`packages/shared/package.json`](../packages/shared/package.json) | `typecheck` script; `./jobs` export |
| [`tests/unit/shared-contracts.test.ts`](../tests/unit/shared-contracts.test.ts) | Asserts new exports from package root |
| [`package.json`](../package.json) (repo root) | `test:unit` includes `shared-socket-job-api-contracts.test.ts` |

---

## 5. Contract details

### 5.1 Error codes (`ErrorCodes`)

- **Shape:** `export const ErrorCodes = { KEY: "KEY", ... } as const`
- **Type:** `export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]`
- **Count:** 96 distinct codes (meets “45+” requirement)
- **New codes** (not in legacy `ERROR_CODES` array): `DOCUMENT_SUBMITTED`, `INVALID_STATUS_TRANSITION`, `FOLDER_CYCLE_DETECTED`
- **Backward compatibility:** `INVALID_TRANSITION`, `DOCUMENT_READONLY_STATUS`, `FOLDER_NOT_EMPTY` retained
- **Legacy:** `ERROR_CODES` and category arrays in `canonical-constants.ts` are **unchanged** so [`shared-contracts.test.ts`](../tests/unit/shared-contracts.test.ts) still passes

### 5.2 Socket events

**`ServerEvents`** includes spec keys with wire strings aligned to production where implemented:

| Constant | Wire value (examples) |
|----------|------------------------|
| `NOTIFICATION_CREATED` | `notification:created` |
| `NOTIFICATION_NEW` | `notification:new` (catalog alias) |
| `ACTIVITY_CREATED` | `activity:created` |
| `COMMENT_REPLY_CREATED` | `comment:reply_created` |
| `TASK_UPDATED` | `task:updated` |
| `JOIN_DENIED` | `client:join_denied` |
| … | workspace, document, task, comment, export events |

**`ClientEvents`:**

| Constant | Wire value |
|----------|------------|
| `JOIN_ROOM` | `room:join:workspace` |
| `LEAVE_ROOM` | `room:leave:workspace` |
| `MARK_NOTIFICATION_READ` | `notification:read` |

**Note:** Services still use inline strings today. Next task should migrate `apps/web/src/api/realtime/socket-client.ts` and API realtime emitters to import `ServerEvents` / `ClientEvents`.

### 5.3 Job types (BullMQ catalog)

- **`Queues`:** `email`, `export`, `maintenance`, `search-index`
- **`JobTypes`:** verification, password reset, invitation, notification email, PDF/markdown export, search index, maintenance purges, version snapshot
- **`JobPayloadByType`:** maps each `JobTypes` entry to a typed payload interface
- **Separate from** `packages/shared/src/queues/*` (file-based verification/invitation queues for local dev)

### 5.4 API envelope types

```typescript
ApiResponse<T>     // { data: T; meta: { requestId; pagination? } }
ApiError           // { error: { code: ErrorCode; message; details?; requestId; timestamp } }
PaginationMeta     // page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage
ValidationDetail   // field, message, rule
```

`ApiError.error.code` is typed as `ErrorCode` from shared error codes.

### 5.5 Template types

**Document:** `DocumentTemplateV2`, `PageLayout`, `DocumentRegion` (with optional layout flags, `content`, `config`), `RegionConfig` union (`CoverRegionConfig`, `DeclarationRegionConfig`, `RolesMatrixRegionConfig`, `TocRegionConfig`, `ChapterRegionConfig`, `AcronymsRegionConfig`, `ReferencesRegionConfig`, generic), `TemplateVariable`, `RichContent` (JSON-safe, no `any`).

**Workspace:** `WorkspaceTemplateV2`, `WorkspaceDefaults`, `WorkspaceStructure`, `FolderSpec`, `DocumentSpec`, `TaskBoardSpec`, `TaskColumnSpec`, `TaskLabelDef`.

[`template-v2.ts`](../packages/shared/src/types/template-v2.ts) re-exports a subset for existing importers.

---

## 6. How to import

```typescript
// Root (recommended)
import {
  ErrorCodes,
  ServerEvents,
  ClientEvents,
  Queues,
  JobTypes,
  type ApiResponse,
  type DocumentTemplateV2,
  type WorkspaceTemplateV2,
} from "@collabsphere/shared";

// Subpaths
import { ErrorCodes } from "@collabsphere/shared/constants";
import type { ApiResponse } from "@collabsphere/shared/types";
import { JobTypes } from "@collabsphere/shared/jobs";
```

---

## 7. Verification commands

```bash
# From repo root
pnpm --filter @collabsphere/shared typecheck

# Contract unit tests only
pnpm exec tsx --test tests/unit/shared-contracts.test.ts tests/unit/shared-socket-job-api-contracts.test.ts
```

**Expected:** typecheck exits 0; 12 tests pass (7 existing shared-contracts + 5 new socket/job/api tests).

Root `pnpm typecheck` also compiles `packages/shared` via `tsc -p packages/shared/tsconfig.json`.

---

## 8. Intentionally out of scope (next tasks)

These were **not** changed in this pass (contracts only):

| Area | Current state | Suggested next step |
|------|---------------|------------------------|
| API `app-error.filter.ts` | Duplicate error-code arrays | Import `ErrorCodes` / category subsets from shared |
| Web `socket-client.ts` | Inline event string unions | Import `ServerEvents`, `ClientEvents` |
| Web `envelope.ts` | Local envelope types | Adopt `ApiResponse` / `ApiError` from shared |
| Worker / BullMQ producers | No shared job type usage yet | Type queue `add()` calls with `JobPayloadByType` |
| `canonical-constants.ts` | `ERROR_CODES` array not derived from `ErrorCodes` | Optional migration + extend arrays with 3 new codes |
| Realtime / comments / notifications | Separate feature work (see below) | Already partially implemented in web/API; migrate to `ServerEvents` |

---

## 9. Related work in the same repo (separate feature)

Realtime comments and notification routing were implemented in an earlier pass (not part of the shared-contracts plan, but relevant for socket migration):

- Web socket namespace `/realtime`, `ensureRealtimeConnected`, `useWorkspaceRealtime`, `useNotificationRealtime`
- Notification category fix (`comment.*` vs `comments.*`), `comment.mention` type
- Activity feed live invalidation + Comments filter tab

When migrating socket code to shared contracts, align emitters/listeners with [`socket-events.ts`](../packages/shared/src/constants/socket-events.ts) production values (`notification:created`, not only `notification:new`).

---

## 10. Checklist for the next developer

- [ ] Run `pnpm --filter @collabsphere/shared typecheck` after any shared change
- [ ] Run shared contract tests before PR
- [ ] Prefer `@collabsphere/shared` imports over duplicating string literals
- [ ] Do not edit `.cursor/plans/shared_package_contracts_*.plan.md`
- [ ] If adding error codes: add to `ErrorCodes` in `error-codes.ts`; consider updating `canonical-constants` category arrays in a follow-up PR
- [ ] If adding socket events: add to `ServerEvents` / `ClientEvents` with the **actual** wire string used in gateway/web

---

## 11. Status

| Plan todo | Status |
|-----------|--------|
| Audit documented | Done |
| `error-codes.ts` | Done |
| `socket-events.ts` | Done |
| `job-types.ts` | Done |
| `api.ts` | Done |
| `template.types.ts` | Done |
| Exports, typecheck script, tests | Done |

**Ready for next task:** service migration to shared contracts (API filter, web socket client, worker queues) per Gap Guide Part 1+.
