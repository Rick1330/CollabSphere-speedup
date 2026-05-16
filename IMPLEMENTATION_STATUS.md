# CollabSphere Implementation Status

**Generated:** 2026-05-16 (updated)  
**Baseline:** `high-rev/phase0-parity-matrix.json` (117 routes, 80 implemented at Phase 0 audit)  
**Runtime root:** `collabsphere-prj03/collabsphere-repo-recovery`  
**Session log:** `docs/ai/sessions/2026-05-16-document-tree-rbac-and-critical-fixes.md`

## Critical fix — API startup crash (2026-05-16)

| Item | Status | Notes |
|------|--------|-------|
| Duplicate `WorkspaceRoleAtLeast` import | **Fixed** | `apps/api/src/folders/folders.nest.controller.ts` — caused `SyntaxError` and no listener on **3001** |
| Symptom | Resolved | `ERR_CONNECTION_REFUSED`, all routes/OAuth appeared broken |
| Duplicate shared export | **Fixed** | `packages/shared/src/index.ts` — `workspace-content-policy` exported once |

**Verify:** `curl http://127.0.0.1:3001/api/v1/health` → `200`.

## P0 — API 404 recovery (Track A)

| Item | Status | Notes |
|------|--------|-------|
| Nest bootstrap (`dev.ts`, `main.ts`, `nest-app-bootstrap.ts`) | **Done** | Global prefix `api/v1`; modules wired in `app.module.ts` |
| `POST /api/v1/workspaces` | **Done** | `WorkspacesNestController.createWorkspace`; membership guard **not** on create/list |
| `POST /api/v1/workspaces/:id/documents` | **Done** | `DocumentsNestController.createDocument` |
| `POST /api/v1/workspaces/:id/folders` | **Done** | On workspaces controller |
| HTTP smoke tests | **Done** | `tests/integration/nest-api-http.test.ts` |
| DB migrate + seed | **Ops** | Run `pnpm prisma migrate deploy` and `pnpm demo:seed-runtime` locally |

**If you still see 404:** the process on port 3001 is not this Nest app (stale server, wrong cwd, or proxy). Verify `GET http://127.0.0.1:3001/api/v1/health` returns the Nest envelope.

## P0.5 — OAuth single sign-in (Track B)

| Item | Status | Notes |
|------|--------|-------|
| Host alignment (`127.0.0.1`) | **Done** | `.env.example`: `API_BASE_URL`, `WEB_APP_URL`, `CORS_ORIGINS` |
| CORS from `CORS_ORIGINS` | **Done** | `nest-app-bootstrap.ts` |
| Suppress `onAuthFailure` during `#oauth=` | **Done** | `auth-session.ts`, `Login.tsx`, `app-providers.tsx`, `api/client` |
| Login awaits workspaces before navigate | **Done** | `Login.tsx` |
| Cookie path audit | **OK** | `auth-cookie.util.ts` uses `path: "/"`, `sameSite: lax` |

## Document tree + RBAC (Track E — 2026-05-16)

| Item | Status | Notes |
|------|--------|-------|
| Shared content policy | **Done** | `packages/shared/src/collab/workspace-content-policy.ts` |
| Folder API RBAC + realtime | **Done** | MEMBER create/rename; MANAGER delete; depth limit |
| Unified `WorkspaceDocumentTree` | **Done** | Documents + Editor; `tree-rows`, context menu, move dialog |
| `filterTree` empty folders | **Done** | `document-tree-filter.ts` |
| Tree cache + invalidation | **Done** | `use-document-tree.ts`, `useWorkspaceRealtime` |
| DocumentEditor hooks crash | **Fixed** | `treePermissions` before loading/error returns |
| Agent reference | **Done** | `docs/agent-ref/features/document-tree-rbac.md` |

## Prior UX (Track C)

| Item | Status |
|------|--------|
| Pending invitations — no pre-accept “View workspace” | Done |
| `accessDenied` workspace redirects | Done |
| Document template API mapping | Done (`document-template-api-map.ts`) |
| Templates page document-only | Done |
| Create wizard `templateId` mapping | Done |
| Dark mode (documents/sidebar) | Partial |

## World-Class phases (Track D)

### Phase 0 — Audit

| Section | Status |
|---------|--------|
| 0.1–0.9 inventories | Reconciled via `high-rev/` artifacts |
| 0.10 `IMPLEMENTATION_STATUS.md` | **This file** |

### Phases 1–2 — Infra & auth

| Gap | Priority | Path |
|-----|----------|------|
| Broader HTTP integration coverage | P1 | `tests/integration/` |
| E2E OAuth | P1 | Manual + future Playwright |
| RBAC matrix tests | P2 | `tests/unit/api-workspaces-policy.test.ts` |

**Present:** `AppModule`, global JWT/CSRF/admin guards, Prisma module, auth Nest module, config validation.

### Phases 3–4 — Workspaces & documents

| Gap | Priority | Notes |
|-----|----------|-------|
| Workspace template V2 engine (full) | P1 | Service exists; catalog seed required |
| Submission workflow E2E | P1 | Controllers present; UI polish |
| Invalid `templateId` → 4xx | **Done** | `documents.service.ts` `TEMPLATE_INVALID` |

### Phases 5–7 — Collab, worker, editor

| Gap | Priority |
|-----|----------|
| Hocuspocus production hardening | P1 |
| BullMQ job coverage | P2 |
| Tiptap paid extensions | P2 (license) |

### Phases 8–10 — Frontend

| Gap | Priority |
|-----|----------|
| Full wizard API truth (all workspace types) | P1 |
| Academic submission surfaces | P1 |
| Editor tree + folders live against API | **Done** (Track E); manual multi-tab sync still worth verifying |

### Phases 11–13 — Ship

| Gap | Priority |
|-----|----------|
| Search/notifications parity | P1 |
| Security audit checklist | P0 before prod |
| Integration test suite expansion | P1 |

## Verification commands

```bash
cd collabsphere-prj03/collabsphere-repo-recovery
pnpm --filter @collabsphere/web run typecheck
pnpm exec tsx --test tests/unit/document-tree-filter.test.ts tests/unit/workspace-content-policy.test.ts
pnpm exec tsx --test tests/unit/api-nest-workspaces-controller.test.ts
pnpm run test:nest-http
```

## Local smoke (with API + DB running)

```bash
curl -s http://127.0.0.1:3001/api/v1/health
# POST /workspaces and POST .../documents with Bearer token → 201
```

Open the SPA at **http://127.0.0.1:8080** (not `localhost`) when using the documented `.env` values.
