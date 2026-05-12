import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminServicePath = path.join(repoRoot, "apps", "api", "src", "admin", "admin.service.ts");

test("admin service writes audit trails for sensitive admin actions", async () => {
  const source = await readFile(adminServicePath, "utf8");

  assert.match(source, /admin\.user\.deactivated/);
  assert.match(source, /admin\.user\.reactivated/);
  assert.match(source, /admin\.user\.promoted/);
  assert.match(source, /admin\.workspace\.force_deleted/);
  assert.match(source, /admin\.audit\.viewed/);
});
