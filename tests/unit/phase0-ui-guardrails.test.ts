import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const webSrcRoot = path.join(repoRoot, "apps", "web", "src");

const allowedLegacyMockImportFiles = new Set([
  "features/auth/components/login-form.tsx",
  "features/auth/pages/AcceptInvite.tsx",
  "features/documents/components/comments/document-comment-body.tsx",
  "features/documents/components/comments/document-comment-composer.tsx",
  "features/documents/components/comments/document-comment-thread.tsx",
  "features/documents/components/comments/document-comments-rail.tsx",
  "features/documents/components/comments/document-mention-autocomplete.tsx",
  "features/documents/components/editor/editor-context-rail.tsx",
  "features/documents/components/editor/editor-review-feedback.tsx",
  "features/documents/components/editor/editor-review-panel.tsx",
  "features/documents/components/editor/editor-submission-history.tsx",
  "features/documents/hooks/use-anchor-decorations.ts",
  "features/documents/hooks/use-document-comments.ts",
  "features/documents/pages/DocumentEditor.tsx",
  "features/review/pages/ReviewQueue.tsx",
  "features/tasks/components/task-board.tsx",
  "features/tasks/components/task-comment-composer.tsx",
  "features/tasks/components/task-comments-thread.tsx",
  "features/tasks/components/task-detail-sheet.tsx",
  "features/tasks/components/task-list.tsx",
  "features/tasks/mocks/tasks.ts",
  "features/tasks/pages/TaskDetail.tsx",
  "features/workspace/components/workspace-academic-progress.tsx",
]);

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return [full];
    }),
  );
  return nested.flat();
};

const isCodeFile = (filePath: string) =>
  (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) &&
  !filePath.endsWith(".test.ts") &&
  !filePath.endsWith(".test.tsx");

test("feature UI code does not bypass adapters with direct fetch", async () => {
  const files = (await walk(webSrcRoot)).filter(isCodeFile);
  const offenders: string[] = [];
  for (const filePath of files) {
    const relative = path.relative(webSrcRoot, filePath).replace(/\\/g, "/");
    if (
      relative.startsWith("api/client/") ||
      relative.startsWith("api/adapters/") ||
      relative.startsWith("lib/")
    ) {
      continue;
    }
    const source = await readFile(filePath, "utf8");
    if (/\bfetch\s*\(/.test(source)) {
      offenders.push(relative);
    }
  }

  assert.deepEqual(offenders, [], `Direct fetch found outside adapters/client: ${offenders.join(", ")}`);
});

test("direct mock imports in feature UI do not grow", async () => {
  const files = (await walk(webSrcRoot)).filter(isCodeFile);
  const offenders: string[] = [];
  for (const filePath of files) {
    const relative = path.relative(webSrcRoot, filePath).replace(/\\/g, "/");
    if (relative.startsWith("api/") || relative.startsWith("lib/")) continue;
    const source = await readFile(filePath, "utf8");
    const hasMockImport =
      /from\s+["']@\/lib\/mock-[^"']+["']/.test(source) ||
      /from\s+["']@\/api\/mocks\/[^"']+["']/.test(source) ||
      /from\s+["']@\/features\/[^"']+\/mocks\/[^"']+["']/.test(source);
    if (hasMockImport && !allowedLegacyMockImportFiles.has(relative)) {
      offenders.push(relative);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `New direct mock imports found in UI code: ${offenders.join(", ")}`,
  );
});
