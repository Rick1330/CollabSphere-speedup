/**
 * Dev utility: report documents with large content_yjs or embedded data: images.
 *
 * Usage:
 *   pnpm exec tsx scripts/shrink-content-yjs-images.mts
 *   pnpm exec tsx scripts/shrink-content-yjs-images.mts --document-id <uuid>
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "database"),
);
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const documentIdFlag = args.indexOf("--document-id");
const documentId = documentIdFlag >= 0 ? args[documentIdFlag + 1]?.trim() : undefined;
const minBytes = Number.parseInt(process.env.YDOC_MIN_BYTES ?? "100000", 10);

async function analyzeRow(id: string, contentYjs: Buffer | null) {
  const buffer = contentYjs ? Buffer.from(contentYjs) : Buffer.alloc(0);
  const scanned = buffer.toString("utf8");
  const dataImageOccurrences = (scanned.match(/data:image/gi) ?? []).length;
  return {
    id,
    bytes: buffer.length,
    dataImageOccurrences,
  };
}

async function main() {
  if (documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, contentYjs: true, title: true },
    });
    if (!doc) {
      console.error(`Document not found: ${documentId}`);
      process.exit(1);
    }
    const stats = await analyzeRow(doc.id, doc.contentYjs);
    console.log(JSON.stringify({ title: doc.title, ...stats }, null, 2));
    return;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; bytes: bigint }>>`
    SELECT id, octet_length(content_yjs) AS bytes
    FROM documents
    WHERE deleted_at IS NULL AND octet_length(content_yjs) > ${minBytes}
    ORDER BY octet_length(content_yjs) DESC
    LIMIT 50
  `;

  console.log(`Documents with content_yjs > ${minBytes} bytes: ${rows.length}`);
  for (const row of rows) {
    const doc = await prisma.document.findUnique({
      where: { id: row.id },
      select: { id: true, title: true, contentYjs: true },
    });
    if (!doc) continue;
    const stats = await analyzeRow(doc.id, doc.contentYjs);
    console.log(
      `- ${doc.id} (${doc.title ?? "untitled"}): ${stats.bytes} bytes, data:image×${stats.dataImageOccurrences}`,
    );
  }

  console.log(
    "\nTo fix bloated docs: re-import DOCX via server worker, or clear content and re-import.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
