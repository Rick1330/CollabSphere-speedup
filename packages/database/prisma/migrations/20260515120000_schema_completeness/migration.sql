-- CollabSphere schema completeness: extensions, additive columns, task_labels, indexes (Part 19)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- document_region_variables.workspace_id (backfill before NOT NULL)
ALTER TABLE "document_region_variables" ADD COLUMN IF NOT EXISTS "workspace_id" UUID;

UPDATE "document_region_variables" AS drv
SET "workspace_id" = d."workspace_id"
FROM "documents" AS d
WHERE drv."document_id" = d."id"
  AND drv."workspace_id" IS NULL;

ALTER TABLE "document_region_variables" ALTER COLUMN "workspace_id" SET NOT NULL;

-- documents workflow denormalization
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ(6);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "submitted_by_id" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "reviewed_by_id" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "review_note" TEXT;

-- templates metadata
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(500);
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "page_count" INTEGER;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "section_count" INTEGER;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- export_jobs signed URL cache
ALTER TABLE "export_jobs" ADD COLUMN IF NOT EXISTS "file_url" VARCHAR(500);

-- task_labels
CREATE TABLE IF NOT EXISTS "task_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "description" VARCHAR(200),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_task_labels_workspace_name" ON "task_labels"("workspace_id", "name");
CREATE INDEX IF NOT EXISTS "idx_task_labels_workspace" ON "task_labels"("workspace_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_labels_workspace_id_fkey'
  ) THEN
    ALTER TABLE "task_labels"
      ADD CONSTRAINT "task_labels_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_labels_created_by_fkey'
  ) THEN
    ALTER TABLE "task_labels"
      ADD CONSTRAINT "task_labels_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Foreign keys for documents workflow columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_submitted_by_id_fkey'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_submitted_by_id_fkey"
      FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_region_variables_workspace_id_fkey'
  ) THEN
    ALTER TABLE "document_region_variables"
      ADD CONSTRAINT "document_region_variables_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Standard indexes (Prisma-managed names)
CREATE INDEX IF NOT EXISTS "idx_documents_workspace_folder_pos" ON "documents"("workspace_id", "folder_id", "position");
CREATE INDEX IF NOT EXISTS "idx_documents_submitted_by" ON "documents"("submitted_by_id");
CREATE INDEX IF NOT EXISTS "idx_documents_reviewed_by" ON "documents"("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "idx_document_region_variables_workspace" ON "document_region_variables"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_folders_workspace_parent_pos" ON "folders"("workspace_id", "parent_id", "position");
CREATE INDEX IF NOT EXISTS "idx_invitations_email_status" ON "invitations"("invited_email", "status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_created" ON "notifications"("recipient_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_export_jobs_requester_created" ON "export_jobs"("requested_by", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_task_columns_workspace_position" ON "task_columns"("workspace_id", "position");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_workspace" ON "workspace_members"("user_id", "workspace_id");

-- Partial indexes (Part 19 — not expressible in Prisma schema)
DROP INDEX IF EXISTS "idx_notifications_recipient_unread";
CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_unread"
  ON "notifications"("recipient_id", "is_read", "created_at" DESC)
  WHERE "deleted_at" IS NULL AND "is_read" = false;

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_active"
  ON "refresh_tokens"("user_id")
  WHERE "revoked_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_workspace_active"
  ON "workspace_members"("user_id", "workspace_id")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_workspace_single_owner"
  ON "workspace_members"("workspace_id")
  WHERE "role" = 'OWNER' AND "is_active" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_workspace_members_active"
  ON "workspace_members"("workspace_id", "user_id")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_invitations_email_status_active"
  ON "invitations"("invited_email", "status", "expires_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_documents_workspace_folder_pos_active"
  ON "documents"("workspace_id", "folder_id", "position")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_folders_workspace_parent_pos_active"
  ON "folders"("workspace_id", "parent_id", "position")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_export_jobs_requester_created_active"
  ON "export_jobs"("requested_by", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- GIN full-text search indexes
CREATE INDEX IF NOT EXISTS "idx_documents_search_vector" ON "documents" USING GIN("search_vector");
CREATE INDEX IF NOT EXISTS "idx_tasks_search_vector" ON "tasks" USING GIN("search_vector");
