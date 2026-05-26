-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "editor_preferences" JSONB;
