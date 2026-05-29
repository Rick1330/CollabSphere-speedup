import assert from "node:assert/strict";
import test from "node:test";

import * as Y from "yjs";

import {
  applyWorkspaceTemplate,
  parseWorkspaceTemplateContent,
} from "../../apps/api/src/workspaces/workspace-template.application.js";

const sampleYjsBase64 = () => {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");
  const paragraph = new Y.XmlElement("paragraph");
  const text = new Y.XmlText();
  text.insert(0, "Seeded");
  paragraph.insert(0, [text]);
  fragment.insert(0, [paragraph]);
  const update = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  return Buffer.from(update).toString("base64");
};

test("parseWorkspaceTemplateContent rejects non-record payloads", () => {
  assert.throws(() => parseWorkspaceTemplateContent("nope"), /TEMPLATE_INVALID|Template/i);
});

test("parseWorkspaceTemplateContent accepts wrapped schema with workspace payload", () => {
  const parsed = parseWorkspaceTemplateContent({
    schemaVersion: 2,
    format: "workspace-v2",
    metadata: {
      title: "  Academic template ",
      category: "academic",
      kind: "workspace",
    },
    workspace: {
      folders: [{ key: "root", name: "Main" }],
      documents: [{ title: "Overview", folderKey: "root" }],
      taskColumns: [{ name: "Backlog", status: "backlog" }],
    },
  });

  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.format, "workspace-v2");
  assert.equal(parsed.metadata?.title, "Academic template");
  assert.equal(parsed.folders?.[0]?.key, "root");
});

test("parseWorkspaceTemplateContent rejects unsupported format values", () => {
  assert.throws(
    () =>
      parseWorkspaceTemplateContent({
        schemaVersion: 2,
        format: "markdown",
      }),
    /TEMPLATE_INVALID|Template/i,
  );
});

test("applyWorkspaceTemplate seeds contentYjs when document template has yjs seed", async () => {
  const yjsSeedBase64 = sampleYjsBase64();
  const documentCreates: Array<Record<string, unknown>> = [];
  const tx = {
    folder: {
      create: async () => ({ id: "folder_1" }),
    },
    document: {
      create: async (args: { data: Record<string, unknown> }) => {
        documentCreates.push(args.data);
        return { id: "doc_1" };
      },
    },
    taskColumn: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    taskLabel: {
      createMany: async () => ({ count: 0 }),
    },
    workspaceSettings: {
      update: async () => ({ workspaceId: "ws_1" }),
    },
    template: {
      findMany: async () => [
        {
          id: "tpl_doc_test_v1",
          kind: "document",
          category: "professional",
          version: 1,
          schemaVersion: 2,
          contentFormat: "document-v2",
          content: {
            schemaVersion: 2,
            format: "document-v2",
            structure: { blocks: [], yjsSeedBase64 },
          },
        },
      ],
    },
  } as const;

  const content = parseWorkspaceTemplateContent({
    schemaVersion: 2,
    folders: [{ key: "root", name: "Main" }],
    documents: [
      {
        title: "PRD",
        folderKey: "root",
        documentTemplateId: "tpl_doc_test_v1",
      },
    ],
    taskColumns: [{ name: "Todo", status: "todo" }],
  });

  await applyWorkspaceTemplate({
    tx: tx as unknown as import("@prisma/client").Prisma.TransactionClient,
    workspaceId: "ws_1",
    workspaceName: "Alpha",
    workspaceType: "professional",
    actorUserId: "user_1",
    templateContent: content,
  });

  assert.equal(documentCreates.length, 1);
  const created = documentCreates[0];
  assert.ok(created?.contentYjs);
  assert.equal(typeof created.contentPlaintext, "string");
  assert.ok(String(created.contentPlaintext).length > 0);
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
      { key: "root", name: "{{workspaceName}} Product" },
      { key: "child", name: "Architecture", parentKey: "root" },
    ],
    documents: [{ title: "{{workspaceType}} PRD", folderKey: "root" }],
    taskColumns: [
      { name: "{{workspaceName}} Backlog", status: "backlog" },
      { name: "Done", status: "done" },
    ],
    settings: {
      allowViewerCommentsOnTasks: true,
      templateOwner: "{{ownerUserId}}",
      nested: { label: "{{workspaceType}}" },
    },
  });

  await applyWorkspaceTemplate({
    tx: tx as unknown as import("@prisma/client").Prisma.TransactionClient,
    workspaceId: "ws_1",
    workspaceName: "Alpha",
    workspaceType: "professional",
    actorUserId: "user_1",
    templateContent: content,
  });

  assert.equal(calls.some((c) => c.method === "folder.create"), true);
  assert.equal(calls.some((c) => c.method === "document.create"), true);
  assert.equal(calls.some((c) => c.method === "taskColumn.deleteMany"), true);
  assert.equal(calls.some((c) => c.method === "taskColumn.createMany"), true);
  assert.equal(calls.some((c) => c.method === "workspaceSettings.update"), true);

  const folderCreateCall = calls.find((c) => c.method === "folder.create");
  assert.equal(
    (folderCreateCall?.args as { data: { name: string } }).data.name,
    "Alpha Product",
  );

  const settingsUpdateCall = calls.find((c) => c.method === "workspaceSettings.update");
  const settingsPayload = (settingsUpdateCall?.args as { data: { settings: Record<string, unknown> } })
    .data.settings;
  assert.equal(settingsPayload.templateOwner, "user_1");
  assert.deepEqual(settingsPayload.nested, { label: "professional" });
});

