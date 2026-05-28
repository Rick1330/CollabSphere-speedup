import { createRequire } from "node:module";

const requireFromDatabasePackage = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { PrismaClient } = requireFromDatabasePackage("@prisma/client");

const email = (process.argv[2] ?? "").trim().toLowerCase();

if (!email) {
  console.error("Usage: node scripts/promote-platform-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, globalRole: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    console.error(`No active user found for ${email}`);
    process.exit(1);
  }

  if (user.globalRole === "ADMIN") {
    console.log(`${email} is already a platform ADMIN.`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { globalRole: "ADMIN" },
  });

  console.log(`Promoted ${email} to platform ADMIN.`);
} finally {
  await prisma.$disconnect();
}
