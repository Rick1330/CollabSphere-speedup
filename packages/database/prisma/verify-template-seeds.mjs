import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = join(__dirname, "template-seeds");

const prisma = new PrismaClient();

const ids = ["tpl_doc_academic_rad_v1", "tpl_doc_professional_prd_v1"];

async function main() {
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`template-seeds on disk: ${files.length} files`);

  for (const id of ids) {
    const row = await prisma.template.findUnique({
      where: { id },
      select: { content: true },
    });
    const b64 = row?.content?.structure?.yjsSeedBase64;
    console.log(`${id}: yjsSeedBase64 length = ${typeof b64 === "string" ? b64.length : 0}`);
    if (!b64 || b64.length < 100) {
      process.exitCode = 1;
    }
  }
}

main()
  .finally(() => prisma.$disconnect());
