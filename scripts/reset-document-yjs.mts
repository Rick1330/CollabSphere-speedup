/**
 * Reset a document's Yjs state to empty (dev repair for bloated/corrupt content_yjs).
 *
 * Usage:
 *   pnpm exec tsx scripts/reset-document-yjs.mts --document-id <uuid>
 *   pnpm exec tsx scripts/reset-document-yjs.mts --document-id <uuid> --dry-run
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Y from "yjs";

const require = createRequire(
  join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "database"),
);
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const idFlag = args.indexOf("--document-id");
const documentId = idFlag >= 0 ? args[idFlag + 1]?.trim() : undefined;
const dryRun = args.includes("--dry-run");

async function main() {
  if (!documentId) {
    console.error("Usage: pnpm exec tsx scripts/reset-document-yjs.mts --document-id <uuid>");
    process.exit(1);
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, title: true, contentYjs: true },
  });

  if (!doc) {
    console.error(`Document not found: ${documentId}`);
    process.exit(1);
  }

  const beforeBytes = doc.contentYjs ? Buffer.byteLength(doc.contentYjs) : 0;
  const emptyState = Buffer.from(Y.encodeStateAsUpdate(new Y.Doc()));

  console.log(
    JSON.stringify(
      {
        documentId: doc.id,
        title: doc.title,
        beforeBytes,
        afterBytes: emptyState.length,
        dryRun,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      contentYjs: emptyState,
      contentPlaintext: "",
    },
  });

  console.log("Document Yjs state reset. Re-open the document in the editor.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
