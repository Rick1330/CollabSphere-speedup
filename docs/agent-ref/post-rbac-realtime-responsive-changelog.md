# Changelog: work after `71758b3` (RBAC guards commit)

**Base commit:** `71758b3` — `feat(api,web): RBAC workspace and admin guards; document and clean login`  
**Date:** 2026-05-18

This document records all substantive changes made after that commit: responsive UI and live role refresh, domain-event → Socket.IO bridge (`RealtimeListener`), EventEmitter2 + Redis publish wiring, and `RealtimeGateway` security hardening.

---

## 1. Responsive UI and live role refresh

### Problem

- Document editor context rail and tree panels had a dead zone between mobile and desktop breakpoints (~900–1024px).
- Workspace and admin areas lacked usable navigation on small viewports.
- After a workspace role change, the client session could stay stale until a full reload.

### Solution

| Area | Change |
|------|--------|
| Breakpoint hook | `apps/web/src/hooks/use-is-below-lg.tsx` — `matchMedia('(max-width: 1023px)')` aligned with Tailwind `lg` |
| Document editor | `DocumentEditor.tsx` uses `useIsBelowLg`; context rail and tree open in Sheets below `lg`; header prop renamed to `contextRailOpen` |
| Panel toggles | `features/documents/lib/editor-panel-toggles.ts` + unit tests |
| Workspace mobile nav | `workspace-nav-items.ts`, `workspace-mobile-nav.tsx`; `WorkspaceMobileNav` on 16 workspace pages |
| Admin mobile nav | `admin-mobile-nav.tsx`; pill nav in `admin-layout.tsx` below `md` |
| Session sync | `settings.ts` — `syncSessionFromApi()`; `SessionSyncBridge` in `app-providers.tsx` on mount |
| Token refresh | `api/client` — `onAccessTokenRefreshed` invalidates React Query `current-user` |
| Realtime role | `use-workspace-realtime.ts` listens for `workspace:role_changed` and refreshes session / invalidates queries |

### Files (new)

- `apps/web/src/hooks/use-is-below-lg.tsx`
- `apps/web/src/features/documents/lib/editor-panel-toggles.ts`
- `apps/web/src/features/documents/lib/editor-panel-toggles.test.ts`
- `apps/web/src/features/workspace/components/workspace-nav-items.ts`
- `apps/web/src/features/workspace/components/workspace-mobile-nav.tsx`
- `apps/web/src/features/admin/components/admin-mobile-nav.tsx`

---

## 2. Domain events → Socket.IO (`RealtimeListener`)

### Architecture

```
Service (emit) → EventEmitter2 (@OnEvent) → RealtimeListener → RealtimeGateway.emitToRoom / emitToUser
```

- **Removed** direct `RealtimeEventsService` calls from `WorkspacesService`, `TasksService`, `DocumentsService`, `CommentsService`, and invitation flows (notifications in comments still use `emitNotification` where appropriate).
- **Enriched** `eventEmitter.emit(...)` payloads in those services so listeners have `workspaceId`, actor, and entity ids.

### New API modules

| File | Purpose |
|------|---------|
| `apps/api/src/realtime/realtime.listener.ts` | 22 `@OnEvent(..., { async: false })` handlers |
| `apps/api/src/realtime/realtime-domain-payloads.ts` | Typed domain event payloads |
| `apps/api/src/common/redis/redis-publish.module.ts` | Global Redis publish helper |
| `apps/api/src/common/redis/redis-publish.service.ts` | `publish(channel, payload)` for cross-process fan-out |

### Domain → socket event map (highlights)

| Domain event | Socket event |
|--------------|--------------|
| `workspace.member_role_changed` | `workspace:role_changed` |
| `workspace.member_added` | `workspace:member_joined` |
| `workspace.member_removed` | `workspace:member_left` |
| `task.status_changed` | `task:moved` |
| `task.created` / `task.updated` / `task.deleted` | `task:created` / `task:updated` / `task:deleted` |
| `document.created` / `document.updated` / `document.deleted` | `document:*` |
| `comment.created` | `comment:created` |
| `activity.recorded` | `activity:new` |
| `notification.created` | `notification:new` (per-user room) |

Full handler list: see `realtime.listener.ts`.

### App wiring

- `EventEmitterModule.forRoot()` and `RedisPublishModule` in `app.module.ts`
- `RealtimeListener` registered in `realtime.nest.module.ts`
- Dependency: `@nestjs/event-emitter` in `apps/api/package.json`

### Web alignment

`apps/web/src/lib/socket-client.ts` and `use-workspace-realtime.ts` use the same event names (`workspace:role_changed`, `task:moved`, `activity:new`; legacy aliases kept where noted in code).

### Tests

- `tests/unit/api-realtime-listener.test.ts`
- `tests/unit/api-domain-events-workspaces.test.ts` (domain emit coverage)

---

## 3. `RealtimeGateway` security and infra fixes

### `RealtimeSessionService`

After `jwtVerify`, loads user from Prisma and rejects connection if `isActive !== true` or `deletedAt != null`. Returns DB-backed `email` and `globalRole`.

### `RealtimeGateway`

| Item | Implementation |
|------|----------------|
| Namespace | `/realtime` (unchanged) |
| Redis adapter | `afterInit(server)` attaches `@socket.io/redis-adapter` on namespace server when `REDIS_URL` set and `SKIP_REDIS_IO_ADAPTER` ≠ `1` |
| Awareness bridge | `pSubscribe('awareness:doc:*')` → emits `document:awareness` to `workspace:{workspaceId}` |
| Connect | Auto-join `user:{userId}`; structured join failures return `{ ok: false, message }` |
| Join validation | `workspace:join`, `document:join`, `task:join`, generic `room:join` validate workspace membership via `assertWorkspaceMembership` |
| Lifecycle | `OnModuleDestroy` quits dedicated Redis clients |

### Types

- `RealtimeEventPrefix` exported from `realtime.types.ts` for listener typing.

### Tests

- `tests/unit/api-realtime-session.test.ts` — JWT + active user / deactivated user cases

### Manual QA checklist

1. Connect to `ws` namespace `/realtime` with valid access token.
2. Change member role → client receives `workspace:role_changed`.
3. Deactivate user in DB → existing socket auth path rejects new connections.
4. Resize editor to ~900px width → context rail opens in Sheet, not clipped.

### Known gaps

- `export.completed` listener exists; export worker does not emit yet.
- Web may not subscribe to `document:awareness` (API broadcasts when collab publishes to Redis `awareness:doc:*`).
- Hocuspocus awareness bridge extension not verified in this pass.

---

## 4. Dependency and lockfile

- Root and `apps/api`: `@nestjs/event-emitter`
- `pnpm-lock.yaml` updated

---

## 5. Incidental / line-ending only

These files appear in `git status` with CRLF normalization only (no logic change):

- `apps/api/src/common/decorators/workspace-role.decorator.ts`
- `apps/web/src/features/auth/post-login-path.ts`
- `scripts/tsconfig.json`
- `tests/unit/api-global-roles-guard.test.ts`
- `docs/agent-ref/api-rbac-workspace-and-admin.md`

---

## 6. How to verify

```bash
# API unit tests
pnpm exec tsx --tsconfig apps/api/tsconfig.json --test \
  tests/unit/api-realtime-session.test.ts \
  tests/unit/api-realtime-listener.test.ts \
  tests/unit/api-domain-events-workspaces.test.ts

# API typecheck
pnpm --filter @collabsphere/api exec tsc --noEmit

# Web unit tests (panel toggles, settings)
pnpm --filter @collabsphere/web exec vitest run \
  src/features/documents/lib/editor-panel-toggles.test.ts \
  src/features/auth/settings.test.ts
```

---

## Related plans (not edited in repo)

- Responsive UI + role sync plan
- RealtimeListener bridge plan
- RealtimeGateway security fixes plan
