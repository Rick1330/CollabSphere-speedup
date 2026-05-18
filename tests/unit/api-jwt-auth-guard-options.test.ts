import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const jwtGuardPath = path.join(
  repoRoot,
  "apps",
  "api",
  "src",
  "common",
  "guards",
  "jwt-auth.guard.ts",
);

test("JwtAuthGuard bypasses auth for OPTIONS preflight at start of canActivate", async () => {
  const source = await readFile(jwtGuardPath, "utf8");
  const canActivateStart = source.indexOf("async canActivate");
  assert.ok(canActivateStart >= 0);
  const canActivateBody = source.slice(canActivateStart, canActivateStart + 600);
  const optionsIndex = canActivateBody.indexOf('request.method === "OPTIONS"');
  const isPublicIndex = canActivateBody.indexOf("isPublic");
  assert.ok(optionsIndex >= 0, "expected OPTIONS method check in canActivate");
  assert.ok(isPublicIndex >= 0, "expected public route handling in canActivate");
  assert.ok(optionsIndex < isPublicIndex, "OPTIONS bypass should run before @Public() handling");
  assert.match(canActivateBody.slice(optionsIndex, optionsIndex + 80), /return true/);
});
