-- Align documents table with schema.prisma (template metadata + properties JSON)

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "template_id" VARCHAR(120);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "template_version" INTEGER;
