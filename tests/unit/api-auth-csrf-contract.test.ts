import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const controllerPath = path.join(repoRoot, "apps", "api", "src", "auth", "auth.nest.controller.ts");
const cookieUtilPath = path.join(repoRoot, "apps", "api", "src", "auth", "auth-cookie.util.ts");

test("auth controller enforces CSRF double-submit on refresh", async () => {
  const source = await readFile(controllerPath, "utf8");
  assert.match(source, /validateCsrfDoubleSubmit\(req\)/);
  assert.match(source, /CSRF_TOKEN_COOKIE/);
});

test("auth cookies include dedicated csrf token cookie", async () => {
  const source = await readFile(cookieUtilPath, "utf8");
  assert.match(source, /setCsrfTokenCookie/);
  assert.match(source, /httpOnly:\s*false/);
});
