# Prisma schema completeness — implementation handoff

**Date:** 2026-05-15  
**Schema path:** [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma) (not `apps/api/prisma`)  
**Migration:** `20260515120000_schema_completeness`

## Audit summary (before changes)

| Model | Status |
|-------|--------|
| RefreshToken | Exists — complete |
| AuditLog | Exists — complete |
| ActivityEvent | Exists — complete |
| Notification | Exists — missing unread partial index |
| NotificationPreference | Exists (singular name) — complete |
| DocumentSubmission | Exists — `decisionNote` maps spec `note` |
| DocumentRegionVariable | Partial — missing `workspaceId` |
| TaskLabel | Missing |
| TaskColumn | Exists — missing workspace index |
| ExportJob | Partial — added `fileUrl`; `outputFileId` retained |
| Document | Partial — added workflow denormalization fields |
| Template | Partial — added `thumbnailUrl`, `pageCount`, `sectionCount`, `tags` |

## What was added

### Models and columns

- **`TaskLabel`** — `task_labels` table with workspace scope, name, color, description, `createdById`
- **`Document`** — `submittedAt`, `submittedById`, `reviewedAt`, `reviewedById`, `reviewNote`
- **`DocumentRegionVariable`** — `workspaceId` (backfilled from parent document)
- **`Template`** — `thumbnailUrl`, `pageCount`, `sectionCount`, `tags`
- **`ExportJob`** — `fileUrl`

### Indexes in Prisma schema

Standard B-tree indexes on hot paths (folders, documents, invitations, notifications, export jobs, task columns, workspace members).

### Indexes in migration SQL only (partial / GIN)

Prisma 6 does not support `where:` on `@@index` in this project — partial and GIN indexes live in [`migration.sql`](../packages/database/prisma/migrations/20260515120000_schema_completeness/migration.sql):

- `pgcrypto`, `citext` extensions
- Partial unread notifications index
- Active refresh tokens, workspace members, invitations, documents, folders, export jobs
- `uq_workspace_single_owner` — one active OWNER per workspace
- `uq_workspace_members_active` — one active membership per user/workspace
- GIN on `documents.search_vector` and `tasks.search_vector`

## Commands

```bash
pnpm --filter @collabsphere/database run validate
pnpm --filter @collabsphere/database run migrate:deploy   # or migrate:dev --name schema-completeness
pnpm --filter @collabsphere/database run generate
```

Use `DATABASE_URL=postgresql://collab:collab@localhost:5432/collabsphere` (or your `.env`) when applying migrations.

## Out of scope

- Populating Document submit/review fields from services
- Task `labels String[]` → `TaskLabel` FK migration
- Full-text `search_vector` update triggers
