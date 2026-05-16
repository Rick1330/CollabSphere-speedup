-- AlterTable
ALTER TABLE "templates" ADD COLUMN "sub_category" VARCHAR(40) NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "template_schema_version" INTEGER;
ALTER TABLE "documents" ADD COLUMN "region_order" JSONB;

-- CreateTable
CREATE TABLE "document_region_variables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "variable_key" VARCHAR(120) NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_region_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_region_variables_doc_key" ON "document_region_variables"("document_id", "variable_key");

-- CreateIndex
CREATE INDEX "idx_document_region_variables_document" ON "document_region_variables"("document_id");

-- AddForeignKey
ALTER TABLE "document_region_variables" ADD CONSTRAINT "document_region_variables_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
