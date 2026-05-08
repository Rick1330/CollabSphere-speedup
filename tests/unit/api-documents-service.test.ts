import assert from "node:assert/strict";
import test from "node:test";
import { DocumentsService } from "../../apps/api/src/documents/documents.service.js";

test("documents service creates document with parsed template metadata", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    folder: {
      findFirst: async () => ({ id: "folder-1" }),
    },
    template: {
      findFirst: async () => ({
        id: "doc-prd-v2",
        kind: "document",
        category: "professional",
        version: 3,
        schemaVersion: 2,
        content: {
          schemaVersion: 2,
          format: "document-v2",
          structure: {
            blocks: [{ type: "cover-page", attrs: { title: "Project Brief" } }],
          },
        },
      }),
    },
    document: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "doc-1",
        workspaceId: data.workspaceId,
        folderId: data.folderId,
        title: data.title,
        status: "draft",
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        createdAt: new Date("2026-05-08T00:00:00.000Z"),
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  const created = await service.createDocument({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    title: "Project Brief",
    folderId: "folder-1",
    templateId: "doc-prd-v2",
  });

  assert.equal(created.templateId, "doc-prd-v2");
  assert.equal(created.templateVersion, 3);
});
