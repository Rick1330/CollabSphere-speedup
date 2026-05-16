# Session: Document tree RBAC, OAuth/dev fixes, and critical crash repairs
## Date: 2026-05-16
## Duration: multi-session
## Agent(s): Cursor (Auto)
## Status: done

## Goal
Restore local dev (API on 3001), fix OAuth/session UX, unify the workspace document tree on Documents + Editor with RBAC and realtime sync, and fix DocumentEditor blank-page crash after opening a newly created document.

## What we did

### 1. P0 — API would not start (`ERR_CONNECTION_REFUSED` on port 3001)
- **Root cause:** Duplicate `import { WorkspaceRoleAtLeast }` in `apps/api/src/folders/folders.nest.controller.ts` (lines 23–24). Nest crashed at module load with `SyntaxError: Identifier 'WorkspaceRoleAtLeast' has already been declared`; nothing listened on 3001.
- **Fix:** Removed duplicate import.
- **Cleanup:** Removed duplicate `export * from "./collab/workspace-content-policy.js"` in `packages/shared/src/index.ts`.
- **Impact:** All UI "Failed to fetch", workspaces, activity, email login, and Google OAuth callback failures were downstream of the API being down — not broken frontend auth code.

### 2. P0.5 — OAuth and dev connectivity (prior work, retained)
- Browser dev API base defaults to `http://127.0.0.1:3001/api/v1` (avoids hung Vite proxy on some Windows setups).
- Use **`http://127.0.0.1:8080`** for the SPA (not `localhost`) so cookies align with `.env` `API_BASE_URL` / `WEB_APP_URL`.
- OAuth: suppress `onAuthFailure` during `#oauth=` hash handling; login awaits workspace bootstrap before navigate.
- Docs: `docs/agent-ref/ops/local-dev.md` troubleshooting section for "Failed to fetch".

### 3. Document tree sync + RBAC (feature work)
**Shared policy** (`packages/shared/src/collab/workspace-content-policy.ts`):
- `canCreateWorkspaceContent` — MEMBER+
- `canOrganizeWorkspaceContent` — MEMBER+ (rename/move)
- `canDeleteWorkspaceContent` — MANAGER+

**API** (`apps/api/src/folders/`, `documents.service.ts`):
- `@WorkspaceRoleAtLeast("MEMBER")` on folder create/rename; `MANAGER` on folder delete.
- Service-level checks via shared policy helpers; folder depth limit; realtime emits (`workspace:folder_*`, `workspace:document_*`).

**Web** (`apps/web/src/features/documents/`):
- `WorkspaceDocumentTree` — unified tree for Documents page + Editor sidebar (`document-tree.tsx`, `tree-rows.tsx`).
- `filterTree` fix — empty folders visible when no search/status filter (`document-tree-filter.ts`).
- `useDocumentTree` / `invalidateDocumentTree` / `useDocumentTreeMutations` for cache coherence.
- Radix context menu + move dialog (`tree-context-menu.tsx`, `tree-move-dialog.tsx`).
- `useWorkspaceRealtime` invalidates document tree on folder/document events.
- `persona-scenario.ts` + `workspaces.ts` — `canOrganizeContent`, `canDeleteContent` on permissions.

### 4. DocumentEditor blank page (Rules of Hooks)
- **Root cause:** `treePermissions` used `useMemo` **after** early returns for `loading` / `error` in `DocumentEditor.tsx`. First render skipped the hook; loaded render added it → React crash.
- **Fix:** Moved `treePermissions` to a null-safe plain computation **before** early returns (after `mergedDoc`). Removed post-return `useMemo`.

## Decisions made
- Prefer direct API on `:3001` in dev over Vite proxy unless `VITE_USE_DEV_PROXY=true`.
- Document tree permissions computed via `getRolePermissions` + workspace status (matches Documents page pattern).
- Folder/document RBAC enforced on API, mirrored in UI for context menus.

## Validation evidence
- `curl http://127.0.0.1:3001/api/v1/health` → 200
- Demo login + `GET /api/v1/workspaces` → 200 with workspaces
- `GET /api/v1/auth/google` → 302
- `pnpm run test:nest-http` → 8/8 pass (includes folder MEMBER create, VIEWER 403, MANAGER delete)
- `pnpm --filter @collabsphere/web run typecheck` → pass
- Unit: `document-tree-filter.test.ts`, `workspace-content-policy.test.ts`

## Where to start next
- Manual E2E: create doc → open in editor → tree CRUD + realtime sync between two tabs.
- Optional: add `tsc -p apps/api --noEmit` to root `typecheck` so duplicate imports cannot ship.
- Yjs/Hocuspocus deep integration per `new-rev/CollabSphere_Yjs_Hocuspocus_Deep_Integration.md`.

## Files that hold context for next agent
- `IMPLEMENTATION_STATUS.md`
- `docs/agent-ref/features/document-tree-rbac.md`
- `docs/agent-ref/ops/local-dev.md`
- `apps/web/src/features/documents/pages/DocumentEditor.tsx` (treePermissions placement)
- `apps/api/src/folders/folders.nest.controller.ts`

## Confidence level
- [x] high — API boot, HTTP tests, and typecheck validated; editor hooks fix is structural.
