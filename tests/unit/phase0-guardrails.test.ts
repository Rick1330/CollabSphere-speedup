import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const apiControllersRoot = path.join(repoRoot, "apps", "api", "src");

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(full);
      }
      return [full];
    }),
  );
  return nested.flat();
};

const controllerFiles = async () =>
  (await walk(apiControllersRoot)).filter((filePath) => filePath.endsWith(".nest.controller.ts"));

test("workspace-scoped Nest handlers require workspaceId param binding", async () => {
  const files = await controllerFiles();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const controllerMatch = source.match(/@Controller\((["'`])([^"'`]+)\1\)/);
    if (!controllerMatch) continue;
    const controllerPath = controllerMatch[2];
    const isWorkspaceController = controllerPath.includes(":workspaceId");
    if (!isWorkspaceController) continue;

    const methodBlockPattern =
      /@(Get|Post|Put|Patch|Delete)\((?:(["'`])([^"'`]+)\2)?\)[\s\S]*?(?:\)\s*\{)/g;
    const methods = source.match(methodBlockPattern) ?? [];
    assert.ok(methods.length > 0, `${path.basename(filePath)} should expose handlers`);

    for (const methodSnippet of methods) {
      assert.match(
        methodSnippet,
        /@Param\("workspaceId"\)/,
        `${path.basename(filePath)} has workspace route method missing @Param("workspaceId")`,
      );
    }
  }
});

test("workspace-scoped Nest handlers use current user context", async () => {
  const files = await controllerFiles();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const controllerMatch = source.match(/@Controller\((["'`])([^"'`]+)\1\)/);
    if (!controllerMatch) continue;
    const controllerPath = controllerMatch[2];
    if (!controllerPath.includes(":workspaceId")) continue;

    const methodBlockPattern =
      /@(Get|Post|Put|Patch|Delete)\((?:(["'`])([^"'`]+)\2)?\)[\s\S]*?(?:\)\s*\{)/g;
    const methods = source.match(methodBlockPattern) ?? [];

    for (const methodSnippet of methods) {
      assert.match(
        methodSnippet,
        /@CurrentUserId\(\)/,
        `${path.basename(filePath)} workspace route method missing @CurrentUserId()`,
      );
    }
  }
});
