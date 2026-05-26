-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "version_label" VARCHAR(200);
