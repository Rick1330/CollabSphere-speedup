import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWorkspaceTemplate,
  parseWorkspaceTemplateContent,
} from "../../apps/api/src/workspaces/workspace-template.application.js";

test("parseWorkspaceTemplateContent rejects non-record payloads", () => {
  assert.throws(() => parseWorkspaceTemplateContent("nope"), /TEMPLATE_INVALID|Template/i);
});

test("applyWorkspaceTemplate creates folders and documents and replaces task columns", async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const tx = {
    folder: {
      create: async (args: unknown) => {
        calls.push({ method: "folder.create", args });
        return { id: `folder_${calls.length}` };
      },
    },
    document: {
      create: async (args: unknown) => {
        calls.push({ method: "document.create", args });
        return { id: `doc_${calls.length}` };
      },
    },
    taskColumn: {
      deleteMany: async (args: unknown) => {
        calls.push({ method: "taskColumn.deleteMany", args });
        return { count: 5 };
      },
      createMany: async (args: unknown) => {
        calls.push({ method: "taskColumn.createMany", args });
        return { count: 2 };
      },
    },
    workspaceSettings: {
      update: async (args: unknown) => {
        calls.push({ method: "workspaceSettings.update", args });
        return { workspaceId: "ws_1" };
      },
    },
  } as const;

  const content = parseWorkspaceTemplateContent({
    schemaVersion: 2,
    folders: [
      { key: "root", name: "Product" },
      { key: "child", name: "Architecture", parentKey: "root" },
    ],
    documents: [{ title: "PRD", folderKey: "root" }],
    taskColumns: [
      { name: "Backlog", status: "backlog" },
      { name: "Done", status: "done" },
    ],
    settings: { allowViewerCommentsOnTasks: true },
  });

  await applyWorkspaceTemplate({
    tx: tx as unknown as import("@prisma/client").Prisma.TransactionClient,
    workspaceId: "ws_1",
    workspaceType: "professional",
    actorUserId: "user_1",
    templateContent: content,
  });

  assert.equal(calls.some((c) => c.method === "folder.create"), true);
  assert.equal(calls.some((c) => c.method === "document.create"), true);
  assert.equal(calls.some((c) => c.method === "taskColumn.deleteMany"), true);
  assert.equal(calls.some((c) => c.method === "taskColumn.createMany"), true);
  assert.equal(calls.some((c) => c.method === "workspaceSettings.update"), true);
});

