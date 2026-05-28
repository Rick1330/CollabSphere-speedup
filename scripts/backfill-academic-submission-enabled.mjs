import { createRequire } from "node:module";

const requireFromDatabasePackage = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { PrismaClient } = requireFromDatabasePackage("@prisma/client");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const batchSizeArg = process.argv.find((a) => a.startsWith("--batch-size="));
const batchSize = batchSizeArg ? Number(batchSizeArg.split("=", 2)[1]) : 200;

if (!Number.isFinite(batchSize) || batchSize <= 0) {
  console.error("Invalid --batch-size. Example: --batch-size=200");
  process.exit(1);
}

const prisma = new PrismaClient();

function forceEnableSubmission(properties) {
  const base = properties && typeof properties === "object" ? properties : {};
  const workflow =
    base.workflow && typeof base.workflow === "object" && !Array.isArray(base.workflow)
      ? base.workflow
      : {};
  return {
    ...base,
    workflow: {
      ...workflow,
      submissionEnabled: true,
    },
  };
}

try {
  const total = await prisma.document.count({
    where: {
      deletedAt: null,
      workspace: { deletedAt: null, type: "academic" },
    },
  });

  console.log(
    `[backfill-academic-submission-enabled] Found ${total} academic documents. dryRun=${dryRun} batchSize=${batchSize}`,
  );

  let updated = 0;
  let scanned = 0;

  let cursorId = null;
  for (;;) {
    const docs = await prisma.document.findMany({
      where: {
        deletedAt: null,
        workspace: { deletedAt: null, type: "academic" },
      },
      orderBy: { id: "asc" },
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      take: batchSize,
      select: {
        id: true,
        properties: true,
      },
    });

    if (docs.length === 0) break;
    cursorId = docs[docs.length - 1].id;

    scanned += docs.length;

    if (dryRun) {
      for (const d of docs) {
        const next = forceEnableSubmission(d.properties);
        const before = d.properties ?? null;
        const changed = JSON.stringify(before) !== JSON.stringify(next);
        if (changed) updated += 1;
      }
      continue;
    }

    for (const d of docs) {
      const next = forceEnableSubmission(d.properties);
      const before = d.properties ?? null;
      const changed = JSON.stringify(before) !== JSON.stringify(next);
      if (!changed) continue;

      await prisma.document.update({
        where: { id: d.id },
        data: {
          properties: JSON.parse(JSON.stringify(next)),
        },
      });
      updated += 1;
    }
  }

  console.log(
    `[backfill-academic-submission-enabled] Done. scanned=${scanned} updated=${updated} dryRun=${dryRun}`,
  );
} finally {
  await prisma.$disconnect();
}

