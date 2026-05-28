/**
 * One-shot cleanup: delete obsolete pre–addendum workspace template rows.
 * Run from repo root: `node scripts/remove-legacy-workspace-templates.mjs`
 */
import { PrismaClient } from "@prisma/client";

const LEGACY_WORKSPACE_TEMPLATE_IDS = [
  "professional-team",
  "academic-thesis",
  "academic-coursework",
  "general-blank",
];

const prisma = new PrismaClient();

try {
  const result = await prisma.template.deleteMany({
    where: { id: { in: LEGACY_WORKSPACE_TEMPLATE_IDS } },
  });
  console.log(
    `Removed ${result.count} legacy workspace template(s): ${LEGACY_WORKSPACE_TEMPLATE_IDS.join(", ")}`,
  );
} finally {
  await prisma.$disconnect();
}
