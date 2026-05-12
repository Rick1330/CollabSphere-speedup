import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const guardedRuntimeFiles = [
  "apps/web/src/lib/auth-session.ts",
  "apps/web/src/api/adapters/auth.ts",
  "apps/web/src/api/adapters/settings.ts",
  "apps/web/src/api/adapters/workspaces.ts",
  "apps/web/src/api/adapters/members.ts",
  "apps/web/src/api/adapters/documents.ts",
  "apps/web/src/api/adapters/activity.ts",
  "apps/web/src/api/adapters/notifications.ts",
  "apps/web/src/api/adapters/admin.ts",
];

test("phase2 runtime adapters do not import mock modules", async () => {
  const offenders: string[] = [];
  for (const relativePath of guardedRuntimeFiles) {
    const fullPath = path.join(repoRoot, relativePath);
    const source = await readFile(fullPath, "utf8");
    const hasMockImport =
      /from\s+["']@\/lib\/mock-[^"']+["']/.test(source) ||
      /from\s+["']@\/features\/[^"']+\/mocks\/[^"']+["']/.test(source) ||
      /from\s+["']@\/api\/mocks\/[^"']+["']/.test(source);
    if (hasMockImport) {
      offenders.push(relativePath);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Mock runtime imports remain in guarded adapters: ${offenders.join(", ")}`,
  );
});
