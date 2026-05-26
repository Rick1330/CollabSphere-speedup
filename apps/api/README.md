# CollabSphere API

## Editor preferences (Phase 3)

Per-user editor UI preferences (recent document colors for the §6.15 color picker).

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `GET` | `/api/v1/users/me/editor-preferences` | Bearer | — | `{ recentColors: string[] }` (max 10, `#RRGGBB`) |
| `PATCH` | `/api/v1/users/me/editor-preferences` | Bearer | `{ recentColors: string[] }` | same |

Stored on `users.editor_preferences` (JSONB). Web client falls back to `localStorage` key `collab-editor-recent-colors` when the API is unavailable.

Migration: `packages/database/prisma/migrations/20260524120000_user_editor_preferences/`

**After pulling Phase 3:** apply pending migrations before starting the API (OAuth and all `user` queries require this column):

```bash
pnpm prisma migrate deploy
```

Use `pnpm prisma` from the repo root so `.env` `DATABASE_URL` is loaded (not `pnpm --filter @collabsphere/database run migrate:deploy` alone, which may use a different default URL).
