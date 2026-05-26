# Document Editor — Migration Audit (Phase 0)

**Generated:** 2026-05-24  
**Design spec:** `D:\coloe\new-rev\collabsphere-document-editor-page-complete-redesign.md`  
**Repo:** `D:\coloe\collabsphere-prj03\collabsphere-repo-recovery`  
**Target structure:** Design doc §10  
**Roadmap:** Design doc §11 (Phases 1–13 start only after explicit approval of this audit)

---

## Executive summary

This audit inventories every editor-related file, maps each to the §10 folder layout, confirms API freeze policy for the redesign, and documents **PRESERVE** contracts for Hocuspocus, Y.Doc, and TipTap collaboration. **No code moves or deletions** are performed in Phase 0.

**API policy (approved):** All existing request/response shapes are **frozen**. Per §7.3, **small new endpoints** may be added only when a capability is genuinely missing, documented in `apps/api/README.md`, without altering any existing route or envelope. Version-history HTTP routes already exist; Phases 9+ are UI-only unless a proven gap requires a new endpoint.

**Collab policy:** Presentation may change; `use-collaborative-document-editor` behavior and server extensions listed under PRESERVE must not regress.

---

## 1. Routes (unchanged shapes)

| Route | Component | File |
|-------|-----------|------|
| `/w/:workspaceId/documents` | Documents list | `features/documents/pages/Documents.tsx` |
| `/w/:workspaceId/documents/new` | Create document | `features/documents/pages/NewDocument.tsx` |
| `/w/:workspaceId/documents/:documentId` | **Main editor** | `features/documents/pages/DocumentEditor.tsx` |
| `/w/:workspaceId/documents/:documentId/history` | Legacy full-page history | `features/documents/pages/DocumentHistory.tsx` |

**Router:** `apps/web/src/app/routing/app-routes.tsx` — `DocumentEditorRoute` uses `key={workspaceId:documentId}` for remount on navigation.

**Redesign rule:** Route paths and param names **must not change**.

---

## 2. File inventory

Paths are relative to `apps/web/src/` unless noted.

### 2.1 Pages

| File | Role |
|------|------|
| `features/documents/pages/DocumentEditor.tsx` | Orchestrator: shell layout, collab hook, rails, overlays, academic flows |
| `features/documents/pages/DocumentHistory.tsx` | Standalone version history page (route above) |
| `features/documents/pages/Documents.tsx` | Workspace document index |
| `features/documents/pages/NewDocument.tsx` | Create flow |

### 2.2 Shell / chrome (`features/documents/components/editor/`)

| File | Role |
|------|------|
| `editor-header.tsx` | Top bar: tree toggle, title, presence, submit, actions menu |
| `editor-toolbar.tsx` | Formatting toolbar |
| `editor-status-bar.tsx` | Words/chars, connection, save pill, width/zoom area |
| `editor-content.tsx` | Page canvas shell (surround + white page column) |
| `editor-left-sidebar.tsx` | Left rail shell (Files / Outline / Stats tabs) |
| `editor-left-sidebar-outline-tab.tsx` | Outline tab content |
| `editor-left-sidebar-stats-tab.tsx` | Stats tab content |
| `editor-rail-chrome.tsx` | Shared rail chrome (icons, collapse) |
| `editor-context-rail.tsx` | Right context rail host + tab strip |
| `editor-context-rail-activity-tab.tsx` | Activity tab |
| `editor-context-rail-tasks-tab.tsx` | Tasks tab |
| `editor-context-rail-team-tab.tsx` | Team tab |
| `editor-outline-rail.tsx` | Heading TOC (legacy / embedded outline) |
| `editor-presence.tsx` | Avatar stack + hover cards |
| `remote-pointer-overlay.tsx` | Remote mouse pointers (awareness `pointer`) |
| `editor-zoom-controls.tsx` | Zoom UI |
| `editor-page-width-controls.tsx` | Normal / Wide / Full width |
| `editor-slash-command.tsx` | `/` command menu |
| `table-insert-dialog.tsx` | Row/col table insert |
| `document-properties-panel.tsx` | Frontmatter-style properties form |
| `editor-readiness-panel.tsx` | Template readiness checklist |
| `editor-readonly-banner.tsx` | Lock / submitted / viewer banners |
| `editor-review-panel.tsx` | Supervisor approve/reject |
| `editor-review-feedback.tsx` | “Changes requested” UI |
| `editor-submit-dialog.tsx` | Submit confirmation |
| `editor-submission-history.tsx` | Submission timeline |
| `editor-footer-utils.ts` | Footer helpers (`scrollToOutlineNode`, counts) |
| `collab-caret-debug.tsx` | DEV collab caret overlay |
| `editor-slash-command.test.ts` | Unit tests |

### 2.3 Version history UI

| File | Role |
|------|------|
| `features/documents/components/version-history-overlay.tsx` | In-editor full-screen overlay; `getLiveYjsState`, restore reconnect |
| `features/documents/components/version-history-detail-panel.tsx` | Right panel in overlay |
| `features/documents/components/version-history-preview-center.tsx` | Preview + diff center |
| `features/documents/components/version-restore-dialog.tsx` | Restore confirm (z-index above overlay) |
| `features/documents/components/history/version-timeline.tsx` | Timeline on `DocumentHistory` page |
| `features/documents/components/history/restore-confirm-dialog.tsx` | Restore on history page |

### 2.4 Document tree

| File | Role |
|------|------|
| `features/documents/components/document-tree.tsx` | `WorkspaceDocumentTree` |
| `features/documents/components/document-tree-build.ts` | Tree data shaping |
| `features/documents/components/document-tree-filter.ts` | Search/filter |
| `features/documents/components/document-tree-types.ts` | Types |
| `features/documents/components/tree-rows.tsx` | Row UI |
| `features/documents/components/tree-context-menu.tsx` | Folder/doc context menus |
| `features/documents/components/tree-create-dialog.tsx` | Create folder/doc |
| `features/documents/components/tree-move-dialog.tsx` | Move dialog |
| `features/documents/components/tree/document-tree-panel.tsx` | Left column panel shell |
| `features/documents/components/tree/document-tree-node.tsx` | Node renderer |
| `features/documents/components/tree/document-shadcn-file-tree.tsx` | File tree UI |
| `features/documents/components/tree/document-shadcn-outline-tree.tsx` | Outline tree UI |

### 2.5 Comments

| File | Role |
|------|------|
| `features/documents/components/comments/document-comments-rail.tsx` | Comments tab in context rail |
| `features/documents/components/comments/document-inline-comment-trigger.tsx` | Selection bubble → comment |
| `features/documents/components/comments/document-comment-composer.tsx` | Compose / reply |
| `features/documents/components/comments/document-comment-thread.tsx` | Thread card |
| `features/documents/components/comments/document-comment-body.tsx` | Thread body |
| `features/documents/components/comments/document-mention-autocomplete.tsx` | @mentions |
| `features/documents/components/comments/document-thread-filters.tsx` | Open/resolved filters |

### 2.6 Hooks (`features/documents/hooks/`)

| File | Role |
|------|------|
| `use-anchor-decorations.ts` | ProseMirror decorations for comment anchors |
| `use-document-comments.ts` | RQ threads, `createThread`, optimistic updates |
| `use-document-comment-realtime.ts` | Socket.IO → refetch threads |
| `use-document-comment-realtime.test.ts` | Tests |
| `use-document-versions.ts` | Version list/detail mutations |
| `use-version-preview-editor.ts` | Read-only TipTap for version preview |
| `use-editor-version-history-shortcuts.ts` | Keyboard shortcuts for history overlay |
| `use-editor-zoom-shortcuts.ts` | Zoom shortcuts |
| `use-document-stats.ts` | Word/char stats |
| `use-approximate-page-count.ts` | Approximate page count |
| `use-document-outline.ts` | Heading outline (v1) |
| `use-v2-document-outline.ts` | Heading outline (v2) |
| `use-outline-active-id.ts` | Active heading while scrolling |
| `use-document-readiness.ts` | Template readiness |
| `use-document-tree.ts` | Tree data / mutations |
| `use-document-tree-state.ts` | Expand/selection persistence |
| `use-document-tree-state.test.ts` | Tests |
| `use-document-linked-tasks.ts` | Tasks tab |
| `use-document-activity.ts` | Activity tab |
| `use-document-thread-focus.ts` | Focus thread in rail |
| `use-tiptap-editor.ts` | Legacy/local Tiptap setup (non-collab path) |

### 2.7 Top-level web hooks & collab

| File | Role |
|------|------|
| `hooks/use-collaborative-document-editor.ts` | **Primary:** Yjs + Hocuspocus + TipTap collab |
| `features/documents/collab/collab-bootstrap.ts` | `prepareDocumentCollabBootstrap` → collab token |
| `features/documents/collab/collab-bootstrap.test.ts` | Tests |
| `editor/cursor-render.ts` | `CollaborationCursor` DOM render |
| `lib/collab-ws-url.ts` | WS URL normalize / reject SPA URLs |
| `lib/collab-ws-url.test.ts` | Tests |

### 2.8 Store

| File | Role |
|------|------|
| `features/documents/stores/use-editor-store.ts` | UI state: page width, focus mode, rail tabs, zoom flags (`localStorage` keys e.g. `cs_editor_page_width`) |

### 2.9 TipTap extensions (`features/documents/editor-extensions/`)

| File | Registered in collab hook |
|------|---------------------------|
| `callout-block.tsx` | Yes |
| `section-block.tsx` | Yes |
| `toc-block.tsx` | Yes |
| `cover-page-block.tsx` | Yes |
| `page-break-block.tsx` | Yes |
| `mermaid-block.tsx` | Yes |
| `math-block.tsx` | Yes |
| `comment-mark.extension.ts` | Yes |
| `comment-anchor-extension.tsx` | Yes (verify build) |

**Also from `@tiptap/*` in collab hook:** StarterKit (`history: false`, `gapcursor: false`), Underline, TextStyle, Color, Highlight, Subscript, Superscript, Link, Placeholder, Table suite, Gapcursor, CharacterCount, Collaboration + CollaborationCursor (after sync).

### 2.10 Lib, mocks, styles, API adapters

| File | Role |
|------|------|
| `features/documents/lib/version-diff/*` | Diff decorations, Yjs → PM doc |
| `features/documents/lib/version-history-format.ts` | Labels, grouping |
| `features/documents/lib/decode-yjs-state.ts` | Base64/binary decode |
| `features/documents/lib/build-version-preview-extensions.ts` | Preview editor extensions |
| `features/documents/lib/editor-panel-toggles.ts` | Panel toggle helpers |
| `features/documents/lib/editor-format-palette.ts` | Format palette |
| `features/documents/lib/comment-*` | Comment mark utilities |
| `features/documents/lib/compute-fit-zoom.ts` | Fit zoom math |
| `features/documents/template-schema.ts` | Template contract types |
| `features/documents/mocks/document-tree.ts` | Dev mocks |
| `features/documents/mocks/versions.ts` | Dev mocks |
| `styles/editor-tokens.css` | Partial design tokens (migrate to §10 path in Phase 1) |
| `index.css` | `.doc-anchor`, page canvas, print styles |
| `api/adapters/documents.ts` | Tree, CRUD, versions |
| `api/adapters/comments.ts` | Thread CRUD |
| `api/adapters/auth.ts` | `getCollabToken` |

### 2.11 Collab server (`apps/collab/src/`)

| File | Role |
|------|------|
| `main.ts` | Hocuspocus `Server`, extension order, health `onRequest` |
| `extensions/auth.extension.ts` | `onAuthenticate` |
| `extensions/persistence.extension.ts` | `onLoadDocument`, `onStoreDocument`, `onDestroy` flush |
| `extensions/document-restore.extension.ts` | Redis subscribe → unload room |
| `extensions/auto-version.extension.ts` | Debounced server snapshots → `document_version` |
| `config/validate-env.ts` | Env validation |
| `lib/prisma.ts`, `lib/redis.ts`, `lib/extract-plaintext.ts` | Infrastructure |

### 2.12 Shared package

| File | Role |
|------|------|
| `packages/shared/src/collab/document-restore-channel.ts` | `DOCUMENT_RESTORED_CHANNEL`, message parser |

---

## 3. Old → new mapping (§10)

**Convention:** Move/rename under `apps/web/src/components/editor/` and `components/ui-kit/`. **Do not** change TipTap command handlers, collab hook logic, or API adapters during shell swaps.

| Current path | §10 target | Phase | Notes |
|--------------|------------|-------|-------|
| `pages/DocumentEditor.tsx` | `shell/EditorShell.tsx` + thin page wrapper | 2 | Page keeps data fetching, routing, overlays wiring |
| `editor/editor-header.tsx` | `shell/TopBar.tsx` | 2 | Breadcrumb, title, DocPill, presence, share |
| *(none)* | `shell/MenuBar.tsx` | 2 | **New** per §6.2 |
| `editor/editor-toolbar.tsx` | `shell/Toolbar/Toolbar.tsx` + `shell/Toolbar/groups/*` | 3 | History, Clipboard, Styles, Font, Character, Color, Paragraph, Lists, Insert, Review |
| `editor/editor-status-bar.tsx` + `editor-page-width-controls.tsx` + `editor-zoom-controls.tsx` | `shell/StatusBar.tsx` | 2 | Mode, page x/y, words, conn, zoom |
| `editor/editor-left-sidebar.tsx` + outline/stats tabs + `tree/document-tree-panel.tsx` | `left/LeftRail.tsx` + `left/panels/FilesPanel.tsx`, `OutlinePanel.tsx`, `StatsPanel.tsx` | 4 | Pages/Bookmarks in Phases 11/4 |
| `editor/editor-context-rail.tsx` + tab files + `comments/document-comments-rail.tsx` | `right/RightRail.tsx` + `right/panels/CommentsPanel.tsx`, `TeamPanel.tsx`, `TasksPanel.tsx`, `ActivityPanel.tsx` | 6 | `InspectorPanel.tsx` **new** |
| `editor/editor-content.tsx` | `canvas/Canvas.tsx` + `canvas/Page.tsx` | 5 | Pagination plugin view-only |
| `editor/remote-pointer-overlay.tsx` + `editor-presence.tsx` | `canvas/PresenceCursors.tsx` + TopBar avatars | 2/6 | Awareness unchanged |
| `editor/editor-slash-command.tsx` | `menus/SlashMenu.tsx` | 7 | `@tiptap/suggestion` |
| `comments/document-inline-comment-trigger.tsx` | `bubbles/TextBubble.tsx` | 7 | Keep `onComment(snippet)` contract |
| `editor/table-insert-dialog.tsx` | `dialogs/InsertTableDialog.tsx` | 8 | |
| `version-history-overlay.tsx` + detail + preview + restore dialog | `dialogs/VersionHistoryScreen.tsx` | 9 | Reuse `lib/version-diff/*`, adapters |
| `pages/DocumentHistory.tsx` | Redirect or embed `VersionHistoryScreen` | 9 | Avoid duplicate UX |
| `editor-extensions/*` | `extensions/*` (under `components/editor/`) | 2+ | **Same registration** in collab hook |
| `hooks/use-collaborative-document-editor.ts` | `components/editor/hooks/useCollab.ts` | 2 | Thin re-export only |
| `hooks/use-tiptap-editor.ts` | `components/editor/hooks/useDocumentEditor.ts` | 2 | Deprecate if unused |
| `stores/use-editor-store.ts` | `components/editor/state/editorStore.ts` | 2 | UI-only zustand |
| `styles/editor-tokens.css` | `components/editor/styles/tokens.css` | 1 | Full §4.2 light + dark |
| `index.css` (editor/PM rules) | `components/editor/styles/editor.css` | 1–2 | Split gradually |

**Stay in place (no §10 move required):** `lib/version-diff/*`, `collab/collab-bootstrap.ts`, `api/adapters/*`, `editor/cursor-render.ts`, `lib/collab-ws-url.ts`, mocks, tests.

### 3.1 §10 files to create (no current equivalent)

| §10 path | Phase |
|----------|-------|
| `components/ui-kit/*` (§4.7 primitives) | 1 |
| `shell/MenuBar.tsx`, `shell/FocusModeBar.tsx` | 2 |
| `left/panels/PagesPanel.tsx`, `BookmarksPanel.tsx` | 4 / 11 |
| `right/panels/InspectorPanel.tsx`, `AIPanel.tsx` | 6 |
| `canvas/Ruler.tsx`, `canvas/pagination/paginationPlugin.ts` | 5 |
| `bubbles/TableBubble.tsx`, `ImageBubble.tsx`, `LinkBubble.tsx` | 7–8 |
| `menus/BlockHandle.tsx` | 7 |
| `dialogs/ShareDialog.tsx`, `PageSetupDialog.tsx`, `InsertImageDialog.tsx`, `FindReplaceBar.tsx`, `ShortcutsSheet.tsx`, `CommandPalette.tsx` | 3 / 8 / 10 |
| `extensions/font-size.ts`, `line-height.ts`, `indent.ts`, `block-handle.ts`, `slash.ts` | 3 / 7 (only if new PM behavior; prefer wiring existing commands) |
| `hooks/useAwarenessPresence.ts`, `usePagination.ts`, `useColorRecents.ts` | 2–5 |

---

## 4. API inventory — freeze confirmation

**Global prefix:** `/api/v1` (Nest bootstrap).

**Policy:** Rows marked **FROZEN** must not change HTTP method, path, query params, or request/response envelope shapes during Phases 1–13. **ADD** only per §7.3 when missing, with `apps/api/README.md` entry.

### 4.1 Documents — FROZEN

Controller: `apps/api/src/documents/documents.nest.controller.ts`  
Base: `workspaces/:workspaceId/documents`

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/workspaces/:workspaceId/documents` | `listDocuments` (`?folderId=` optional) |
| GET | `/api/v1/workspaces/:workspaceId/documents/tree` | `getTree` |
| GET | `/api/v1/workspaces/:workspaceId/documents/:documentId` | `getDocument` |
| POST | `/api/v1/workspaces/:workspaceId/documents` | `createDocument` |
| PUT | `/api/v1/workspaces/:workspaceId/documents/:documentId` | `updateDocument` |
| PUT | `/api/v1/workspaces/:workspaceId/documents/:documentId/content` | `updateDocumentContent` |
| PATCH | `/api/v1/workspaces/:workspaceId/documents/:documentId/variables` | `patchDocumentVariables` |
| DELETE | `/api/v1/workspaces/:workspaceId/documents/:documentId` | `deleteDocument` |
| POST | `.../:documentId/lock` | `lockDocument` |
| POST | `.../:documentId/unlock` | `unlockDocument` |
| GET | `.../:documentId/versions` | `listVersions` |
| POST | `.../:documentId/versions` | `createVersion` (manual snapshot) |
| GET | `.../:documentId/versions/:versionId` | `getVersionDetail` |
| PATCH | `.../:documentId/versions/:versionId` | `patchVersionLabel` |
| POST | `.../:documentId/versions/:versionId/restore` | `restoreVersion` |
| GET | `.../:documentId/submissions` | `listSubmissions` |
| POST | `.../:documentId/submit` | `submitDocument` |
| POST | `.../:documentId/request-changes` | `requestChanges` |
| POST | `.../:documentId/approve` | `approveDocument` |

**Web adapter:** `api/adapters/documents.ts` — `listDocumentVersions`, `getDocumentVersionDetail`, `createDocumentVersion`, `restoreDocumentVersion`, `updateDocumentVersionLabel`, tree CRUD, etc.

**Internal behavior (frozen):** `PUT .../content` and collab `onStoreDocument` both persist `contentYjs` / plaintext; restore publishes Redis event (see PRESERVE).

### 4.2 Folders — FROZEN

Controller: `apps/api/src/folders/folders.nest.controller.ts`  
Base: `workspaces/:workspaceId/folders`

| Method | Path |
|--------|------|
| POST | `/api/v1/workspaces/:workspaceId/folders` |
| PATCH | `/api/v1/workspaces/:workspaceId/folders/:folderId` |
| DELETE | `/api/v1/workspaces/:workspaceId/folders/:folderId` |

### 4.3 Comments — FROZEN

Controller: `apps/api/src/comments/comments.nest.controller.ts`  
Base: `workspaces/:workspaceId/comments`

| Method | Path | Notes |
|--------|------|-------|
| GET | `.../comments?targetType=document\|task&targetId=` | List threads |
| POST | `.../comments/threads?targetType=&targetId=` | Body: `{ content, anchor? }` |
| POST | `.../comments/threads/:threadId/replies` | Reply |
| PATCH | `.../comments/threads/:threadId/resolve` | Body: optional `{ resolved: false }` |
| PATCH | `.../comments/:commentId` | Update |
| PATCH | `.../comments/:commentId/delete` | Soft delete |

**Anchor shape (frozen):** `{ snippet: string, status: "ok" }` — no PM `from`/`to` in API.

### 4.4 Collaboration token — FROZEN

| Method | Path | Body |
|--------|------|------|
| POST | `/api/v1/auth/collab-token` | `{ workspaceId, documentId }` (UUIDs) |

Response envelope: `wrapSuccessResponse` + `extraData` with `token`, `expiresInSeconds` (via `issueCollabToken`).

### 4.5 Exports — FROZEN

| Method | Path |
|--------|------|
| POST | `/api/v1/workspaces/:workspaceId/exports` |
| GET | `/api/v1/exports/:exportJobId` |

Body create: `{ resourceId, format: "pdf" | "markdown" }`.

### 4.6 Editor-adjacent (frozen if used by editor)

| Area | Base | Used for |
|------|------|----------|
| Tasks | `workspaces/:workspaceId/tasks` | Task-from-selection, tasks tab |
| Activity | `workspaces/:workspaceId/activity` | Activity tab |
| Workspaces members | `workspaces/:workspaceId/members` | Team tab, presence profiles |
| Users | `users/me` | Session / profile |

### 4.7 Not implemented (spec / parity gaps)

Do **not** invent during redesign without explicit approval:

- Files/attachments HTTP API (`GET/POST .../files`, upload-intent, etc.)
- `PATCH` document metadata (client uses `PUT` today)
- `POST .../documents/:documentId/export` (exports use separate module)
- `GET .../documents/submission-queue`
- REST “presence” endpoints (presence = Hocuspocus awareness only)

### 4.8 §7.3 allowed additions (document before coding)

| Capability | Preferred approach | If endpoint needed |
|------------|-------------------|-------------------|
| Recent text/highlight colors | `localStorage` per user | Optional new `PATCH users/me/editor-prefs` — **new** route only |
| AI assist | Feature flag + stub | New AI routes out of scope unless approved |

---

## 5. Hocuspocus / Y.Doc / TipTap — PRESERVE

### 5.1 Architecture

```
Browser (use-collaborative-document-editor)
  → POST /api/v1/auth/collab-token
  → HocuspocusProvider(ws, name=doc:{uuid}, document=Y.Doc, token)
  → apps/collab: onAuthenticate → onLoadDocument → sync → onStoreDocument
  → Postgres document.contentYjs (+ document_version rows)
Restore: API restore → Redis collab:document:restored → collab unload room → client hardReconnectAfterRestore
```

**Orthogonal:** Socket.IO workspace realtime (`WorkspaceRealtimeLayout`, comment events) is **not** Hocuspocus.

### 5.2 Web — `hooks/use-collaborative-document-editor.ts`

| Contract | Value / rule |
|----------|----------------|
| **PRESERVE** Room name | `` `doc:${documentId}` `` |
| **PRESERVE** Provider | `new HocuspocusProvider({ url, name, document: ydoc, token, autoConnect: false })` |
| **PRESERVE** Connect | After `deferPastStrictModeUnmount()`, `await provider.connect()`; 15s timeout → `error` |
| **PRESERVE** Session key | `` `${workspaceId}:${documentId}:${restoreGeneration}` `` — full teardown when any segment changes |
| **PRESERVE** TipTap Collaboration | `Collaboration.configure({ document: collabSession.provider.document })` — **not** raw `ydoc` alone |
| **PRESERVE** TipTap history | `StarterKit.configure({ history: false, gapcursor: false })` |
| **PRESERVE** Collab extensions gate | `Collaboration` + `CollaborationCursor` only after `onSynced` sets `collabSession` |
| **PRESERVE** CollaborationCursor | `provider`, `user: { id, name, color }`, `render: renderCursor` |
| **PRESERVE** Awareness `user` | `{ id, name: fullName, color: generateUserColor(id), avatarUrl }` |
| **PRESERVE** Awareness `pointer` | `{ x, y, visible: true }` with x,y ∈ [0,1] relative to `pointerRootRef`, or `null`; throttle 50ms |
| **PRESERVE** Awareness `cursor` | Managed by `CollaborationCursor` — do not clear or override |
| **PRESERVE** Status values | `connecting`, `connected`, `synced`, `offline`, `error`, `auth_failed` |
| **PRESERVE** Token refresh | `provider.setConfiguration({ url, token })`; schedule at `max(30s, (expiresInSeconds - 60) * 1000)` |
| **PRESERVE** Auth retry | One `onAuthenticationFailed` → refresh + reconnect; else `auth_failed` |
| **PRESERVE** `getLiveYjsState()` | `Y.encodeStateAsUpdate(provider.document)` |
| **PRESERVE** `hardReconnectAfterRestore()` | `teardownCollabSession()` → 400ms → `restoreGeneration++` |
| **PRESERVE** Hook return | `editor`, `status`, `onlineUsers`, `presenceUsers`, `provider`, `awarenessSnapshot`, `reconnect`, `hardReconnectAfterRestore`, `sessionVersion`, `getLiveYjsState` |

### 5.3 Web — `features/documents/collab/collab-bootstrap.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | `getCollabToken({ workspaceId, documentId })` → `POST /api/v1/auth/collab-token` |
| **PRESERVE** | On `AuthError`, return empty token + `readOnlyReason` from policy code map |
| **PRESERVE** | WS URL resolution in hook: `normalizeCollabWsUrl(bootstrap.hocuspocusUrl)` → `VITE_COLLAB_WS_URL` → `resolveCollabWsUrlFromEnv()` |

### 5.4 Web — `lib/collab-ws-url.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | Reject WebSocket URLs pointing at Vite SPA (e.g. `:8080` document routes) |
| **PRESERVE** | Default collab target `ws://127.0.0.1:3002/collab` (or env equivalent) |

### 5.5 Web — `editor/cursor-render.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | Custom cursor DOM used by `CollaborationCursor` `render` callback |

### 5.6 Web — version history Yjs bytes

| File | Contract |
|------|----------|
| `version-history-overlay.tsx` | `getLiveYjsState()` for compare-with-current; REST `yjsState` / `yjsStateBase64` for historical versions |
| `lib/version-diff/*`, `decode-yjs-state.ts` | Same binary encoding as live collab (`Y.applyUpdate` / `encodeStateAsUpdate`) |

### 5.7 Server — `apps/collab/src/main.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | Port `COLLAB_PORT` default **3002** |
| **PRESERVE** | Extension order: `authExtension` → `createPersistenceExtension` → `createDocumentRestoreExtension` → `autoVersionExtension` |
| **PRESERVE** | Health: `GET /` or `/health` → `{ service: "collab", status: "ok" }` |

### 5.8 Server — `extensions/auth.extension.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | JWT verify with `COLLAB_JWT_SECRET`; claims `sub`, `workspaceId`, `documentId` |
| **PRESERVE** | Document name regex `^doc:{uuid}$` |
| **PRESERVE** | `connectionConfig.readOnly = !canEdit`; edit requires MEMBER+, not locked, not submitted/approved (unless MANAGER+) |
| **PRESERVE** | Context fields: `userId`, `documentId`, `workspaceId`, `role`, `canEdit`, `readOnly` |

### 5.9 Server — `extensions/persistence.extension.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | `onLoadDocument`: load `document.contentYjs` → `Y.applyUpdate`; throw on missing doc or corrupt state |
| **PRESERVE** | `onStoreDocument`: debounce **5s**, max wait **30s**; persist `Y.encodeStateAsUpdate` + plaintext |
| **PRESERVE** | `onDestroy`: flush pending saves |
| **PRESERVE** | Side effect: Redis `queue:search-index` push (non-blocking) |

### 5.10 Server — `extensions/document-restore.extension.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | Subscribe Redis channel `collab:document:restored` (`DOCUMENT_RESTORED_CHANNEL`) |
| **PRESERVE** | Message `{ documentId: string }` |
| **PRESERVE** | On message: `closeConnections(doc:{id})` + `unloadDocument` |

### 5.11 Server — `extensions/auto-version.extension.ts`

| Contract | Value |
|----------|-------|
| **PRESERVE** | Server-side snapshots to `document_version` on interval / disconnect rules |
| **PRESERVE** | Do not duplicate with client-only versioning logic |

### 5.12 API — restore side effect

| Contract | Value |
|----------|-------|
| **PRESERVE** | After `restoreDocumentVersion`, publish `collab:document:restored` with `{ documentId }` (`publish-document-restored.ts`) |

### 5.13 Binary storage

| Store | Column | Format |
|-------|--------|--------|
| Live document | `document.contentYjs` | Yjs update `Uint8Array` |
| Version row | `document_version.yjsState` | Same encoding |
| API detail | `yjsStateBase64` / decoded `yjsState` | Round-trip compatible with `Y.applyUpdate` |

---

## 6. Ambiguities (do not invent)

| Topic | Spec | Planned resolution |
|-------|------|-------------------|
| Multi-page | §7.1 view-only | Phase 5 PM decoration plugin; rollback if selection/cursor regress |
| Color recents | §6.15 | `localStorage` first; optional **new** prefs API per §7.3 |
| `useCollab` naming | §10 | Re-export `use-collaborative-document-editor`; no fork |
| Version UX | §6.13 vs overlay | Phase 9: `VersionHistoryScreen`; keep diff/restore libs |
| AI | §7.8 | Flag + stub only |
| Menu export | Header stubs | Out of Phase 0–2 unless export API wired separately |

---

## 7. §11 phased roadmap

**Verification gate (every phase):** Two browsers, same document — typing syncs, remote cursors visible, comment threads refetch, version preview/compare works.

| Phase | Est. | Deliverable | API / collab |
|-------|------|-------------|--------------|
| **0** | 1d | This file + approval | None |
| **1** | 2d | `components/editor/styles/tokens.css`, `components/ui-kit/*`, `/_kit` route | No editor wiring |
| **2** | 2d | `EditorShell`, `TopBar`, `MenuBar`, `StatusBar`, rails; `useCollab` re-export | Collab untouched |
| **3** | 2d | Grouped toolbar + `ColorPicker` | TipTap commands only |
| **4** | 2d | Files, Outline, Bookmarks, Stats panels | Existing tree endpoints |
| **5** | 3d | Pagination, ruler, focus, zoom | No Y.Doc schema change |
| **6** | 2d | Comments, Team, Activity, Inspector | Comment API frozen |
| **7** | 2d | TextBubble, SlashMenu, BlockHandle | |
| **8** | 1.5d | Table bubble, styles, insert dialog | |
| **9** | 2d | `VersionHistoryScreen` | No version API shape changes |
| **10** | 1d | Command palette + shortcuts sheet | |
| **11** | 1d | Pages panel + thumbnails | |
| **12** | 2d | A11y, responsive §8, dark, motion | |
| **13** | — | `QA_REPORT.md` per §2 / §6 | |

**Hard rules:** No raw hex/px in components (tokens only). No frozen API shape changes. No Hocuspocus/Yjs/TipTap schema changes. Preserve handlers when swapping UI.

---

## 8. Phase 0 sign-off

| Check | Status |
|-------|--------|
| Full editor file inventory | Done (§2) |
| §10 old → new map | Done (§3) |
| API list + freeze policy | Done (§4) |
| PRESERVE collab contracts | Done (§5) |
| §11 roadmap | Done (§7) |

**Next step:** Phase 2 complete — approval required before **Phase 3** (toolbar regroup). Legacy `features/documents/components/editor/*` remain as thin re-exports until Phase 4+ cleanup.

---

## 9. Phase 1 sign-off (2026-05-24)

| Deliverable | Path | Status |
|-------------|------|--------|
| Design tokens (§4.2–4.6) | `components/editor/styles/tokens.css` | Done |
| Token import | `index.css` | Done |
| ui-kit primitives (§4.7) | `components/ui-kit/*` | Done |
| Dev showcase | `features/dev/pages/KitShowcasePage.tsx`, route `/_kit` (DEV only) | Done |

**Not modified:** `features/documents/**` editor shell, collab hook, API.

**Verify locally:** `pnpm --filter @collabsphere/web dev` → open `http://localhost:8080/_kit`, toggle light/dark.

---

## 10. Phase 2 sign-off (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Collab hook alias | `components/editor/hooks/useCollab.ts` | Done |
| Store re-export | `components/editor/state/editorStore.ts` | Done |
| Editor shell layout (§5) | `components/editor/shell/editor-shell.css`, `EditorShell.tsx` | Done |
| TopBar / MenuBar / StatusBar | `components/editor/shell/{TopBar,MenuBar,StatusBar}.tsx` | Done |
| Left rail + panel | `components/editor/left/*` | Done |
| Right rail + panel | `components/editor/right/*` | Done |
| DocumentEditor wiring | `features/documents/pages/DocumentEditor.tsx` | Done |
| Legacy re-exports | `editor-header`, `editor-status-bar`, `editor-left-sidebar`, `editor-context-rail` | Done |

**Verify locally:** `pnpm --filter @collabsphere/web dev` → open a document editor; confirm shell rows (top bar, menu bar, toolbar, rails, status bar) and mobile sheets below `lg`.

---

## 11. Phase 3 sign-off (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Grouped toolbar (§6.3) | `components/editor/shell/Toolbar/Toolbar.tsx` + `groups/*` | Done |
| Styles gallery | `Toolbar/StylesGroup.tsx`, `styles-gallery.css` | Done |
| Color picker primitive (§6.15) | `components/ui-kit/ColorPicker.tsx` + `react-colorful` | Done |
| Recent colors API | `GET/PATCH /users/me/editor-preferences`, migration `editor_preferences` | Done |
| `useRecentColors` hook | `components/editor/hooks/useRecentColors.ts` | Done |
| Toolbar utils (TipTap chains) | `shell/Toolbar/toolbar-utils.ts` | Done |
| DocumentEditor wiring | Uses `Toolbar` from shell; `editor-toolbar.tsx` re-export | Done |

**Not modified:** `use-collaborative-document-editor.ts`, TipTap extensions, collab apps.

**Stubs (toast):** format painter, clipboard, font family/size, paragraph align/spacing, checklist, review track-changes — per plan until later phases.

**Verify locally:** `/_kit` color picker; document editor grouped toolbar; pick custom hex + reload for recent colors; styles gallery applies headings/quote/code; narrow width shows overflow ⋯ menu.

---

## 12. Shell layout + toolbar remediation (2026-05-25)

| Deliverable | Path | Status |
|-------------|------|--------|
| Full-width toolbar row above rails/panels | `shell/EditorShell.tsx`, `editor-shell.css` | Done |
| Insert group trimmed (link/image/table + more menu) | `Toolbar/groups/InsertGroup.tsx` | Done |
| Overflow hide order (spec §6.3) | `Toolbar/useToolbarOverflow.ts` | Done |
| Overflow menu as command list | `Toolbar/ToolbarOverflowMenu.tsx` | Done |
| Single responsive toolbar (no duplicate mobile strip) | `Toolbar/Toolbar.tsx` | Done |
| Toolbar spacing tokens | `styles/tokens.css`, `Toolbar/toolbar.css` | Done |
| TopBar breadcrumb + editable title + DocPill | `TopBar.tsx`, `DocPill.tsx` | Done |

**Verify locally:** Left/right panels align with canvas top (below toolbar); narrow toolbar hides Styles before History; Insert shows ≤4 controls + more menu.

---

## 13. Phase 5 — Paginated canvas (view-only) + ruler + focus + zoom (2026-05-25)

| Deliverable | Path | Status |
|-------------|------|--------|
| Page setup types + content box | `canvas/pageSetup.ts` | Done |
| Editor store (zoom 25–400, ruler, HF map) | `features/documents/stores/use-editor-store.ts` | Done |
| Pagination plugin (Approach A) | `canvas/pagination/paginationPlugin.ts` | Done |
| Page measurement | `canvas/pagination/measureDocumentPages.ts` | Done |
| `usePagination` hook (external PM register) | `canvas/usePagination.ts` | Done |
| Paginated canvas + ruler | `canvas/PaginatedEditorCanvas.tsx`, `Ruler.tsx` | Done |
| Header/footer zones | `canvas/PageHeaderFooter.tsx` | Done |
| Fit width / fit page zoom | `lib/compute-fit-zoom.ts` | Done |
| Focus shortcut ⌘. + floating pill | `use-focus-mode-shortcut.ts`, `FocusModeToolbarPill.tsx` | Done |
| Focus paragraph dimming | `pagination/focusParagraphPlugin.ts` | Done |
| StatusBar page label | `hooks/use-pagination-page-label.ts` | Done |
| View menu (ruler, page breaks, zoom) | `shell/MenuBar.tsx` | Done |

**Approach:** **B (native visuals, mockup-aligned)** — `tiptap-pagination-plus@tiptap-v2` handles page breaks; white `.rm-with-pagination` column; grey `.rm-pagination-gap` gutters; centered `Page {page}` footers; A4 default. `PageSheetStack.tsx` kept for rollback only. Approach A retained for rollback.

**Rollback to hybrid sheets:** Re-enable `PageSheetStack` in `PaginatedEditorCanvas` and restore sheet measurement helpers.

**Collab verification checklist (manual):**

1. Two browsers, same doc, both `synced`.
2. A types para 1, B types para 2 — no caret teleport.
3. Insert/delete `pageBreakBlock` — remote sees break; layout remeasures without selection jump.
4. Zoom 50%/150%, focus on/off, ruler toggle — sync intact.
5. Resize window — no runaway decoration loop.

**Automated:** `measureDocumentPages.test.ts` (Vitest).

### 13.1 Pagination Plus integration (2026-05-25)

| Deliverable | Path |
|-------------|------|
| Dependency | `tiptap-pagination-plus@tiptap-v2` |
| Config | `canvas/paginationPlusConfig.ts` |
| Extension register | `hooks/use-collaborative-document-editor.ts` (config only) |
| Store sync | `canvas/usePaginationPlusSync.ts` |
| Focus dimming | `canvas/useFocusParagraph.ts` |
| Native canvas | `PaginatedEditorCanvas.tsx`, `pagination/pagination.css` |
| Page count (DOM only) | `canvas/measurePaginationPlusLayout.ts` — `pagination.children.length`, no scrollHeight inflation |
| StatusBar pages | `hooks/use-pagination-page-label.ts` via `[data-rm-pagination]` |
| Page Setup dialog (MVP) | `dialogs/PageSetupDialog.tsx` — File → Page setup; Letter/A4/Legal, orientation, margin presets |

**Visual fix (2026-05-25):** Removed conflicting `PageSheetStack` hybrid; native PaginationPlus only.

**Mockup alignment (2026-05-25):** Default **A4** (`pageSetup.ts`); `PAGE_GAP_PX` 40; footer `Page {page}` centered in margin band; `ProseMirror` Source Serif 4 / 11pt / 1.5 line-height (`pagination.css`); `DOC_BODY_FONT_SIZE_PT` constants.

### 13.2 Toolbar formatting + typography (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Body 11pt / headings 12pt (CSS) | `pagination/pagination.css`, `styles-gallery.css` | Done |
| `DOC_HEADING_FONT_SIZE_PT` | `canvas/pageSetup.ts` | Done |
| TipTap: TextAlign, TaskList, FontFamily | `use-collaborative-document-editor.ts` | Done |
| Local FontSize, LineHeight, ParagraphIndent | `components/editor/extensions/*` | Done |
| Font / Paragraph / Lists groups wired | `Toolbar/groups/FontGroup.tsx`, `ParagraphGroup.tsx`, `ListsGroup.tsx` | Done |
| Clipboard + Review (comments) | `ClipboardGroup.tsx`, `ReviewGroup.tsx`, `DocumentEditor.tsx` | Done |
| Overflow menu commands | `ToolbarOverflowMenu.tsx` | Done |
| Toolbar helpers + tests | `toolbar-utils.ts`, `toolbar-formatting.test.ts` | Done |

**Still stubbed/disabled:** format painter, insert image/chart, footnotes, track changes, spell check, rich HTML paste.

### 13.3 Editor UI mockup alignment (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Unified font size `[-] 11 [+]` | `Toolbar/controls/FontSizeControl.tsx` | Done |
| Font family dropdown (6 faces) | `toolbar-utils.ts`, `FontGroup.tsx` | Done |
| Styles trigger shows Body/Heading | `StylesGroup.tsx`, `getActiveStyleLabel` | Done |
| Toolbar order + QuickInsert group | `Toolbar.tsx`, `QuickInsertGroup.tsx` | Done |
| Mode switcher on toolbar | `EditorModeSwitcher.tsx`, `ReviewGroup.tsx` | Done |
| Clipboard in overflow + Edit menu wired | `MenuBar.tsx`, `ToolbarOverflowMenu.tsx` | Done |
| Dark editor chrome (opt-in) | `use-editor-appearance.ts`, `EditorShell` `.dark` | Done |
| Page theme toggle light/dark | `use-editor-store`, `pagination.css`, View menu | Done |
| Stats mockup grid | `editor-left-sidebar-stats-tab.tsx` | Done |
| Left rail Pages + Bookmarks | `LeftRail.tsx`, `PagesPanel.tsx`, `BookmarksPanel.tsx` | Done |

### 13.4 Light-mode palette default (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Chrome defaults light (no OS auto-dark) | `use-editor-appearance.ts` — only `localStorage cs-appearance=dark` | Done |
| Token aliases `--text-primary`, `--editor-*` | `styles/tokens.css` (`:root` + `.dark`) | Done |
| Outer shell canvas bg `--surface-2` | `DocumentEditor.tsx` | Done |
| Toolbar controls white (`--surface-0`) | `Toolbar/toolbar.css` | Done |
| Rails/zoom token colors | `editor-rail-chrome.tsx`, `editor-zoom-controls.tsx`, panels | Done |
| Stats header + metric icons | `editor-left-sidebar-stats-tab.tsx` | Done |
| Canvas text `--text-strong` | `pagination.css` | Done |

**Chrome dark mode:** set `localStorage.setItem('cs-appearance', 'dark')` and reload. OS `prefers-color-scheme` does not affect editor chrome.

### 13.5 Editor responsiveness (2026-05-21)

| Deliverable | Path | Status |
|-------------|------|--------|
| Toolbar no longer frozen during `collab.status === "connected"` | `DocumentEditor.tsx` | Done |
| Selection comment filter isolated from page shell | `use-comment-selection-filter.ts` | Done |
| Debounced save badge, pagination meta, page label | `editor-event-scheduler.ts`, hooks | Done |
| Status word count on `update` only | `editor-footer-utils.ts` | Done |
| `React.memo` on Toolbar + PaginatedEditorCanvas | `Toolbar.tsx`, `PaginatedEditorCanvas.tsx` | Done |
| Stable `useEditor` deps (no `JSON.stringify(properties)`) | `use-collaborative-document-editor.ts` | Done |
| Single awareness pipeline (`onAwarenessUpdate` only) | `use-collaborative-document-editor.ts` | Done |
| V2 outline: one scanner active | `editor-left-sidebar-outline-tab.tsx` | Done |

**Bug fixed:** Toolbar `isReadOnly` incorrectly included `collab.status === "connected"`, disabling formatting for the entire sync window.

---

*End of migration audit.*
