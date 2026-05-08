import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
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

test("documents service lists documents for member", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findMany: async () => [
        {
          id: "doc-1",
          workspaceId: "ws-1",
          title: "Doc A",
        },
      ],
    },
  };

  const service = new DocumentsService(prisma as never);
  const docs = await service.listDocumentsForUser({
    actorUserId: "user-1",
    workspaceId: "ws-1",
  });

  assert.equal(docs.length, 1);
  assert.equal(docs[0]?.id, "doc-1");
});

test("documents service rejects non-member when reading", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => null,
    },
  };

  const service = new DocumentsService(prisma as never);
  await assert.rejects(
    () =>
      service.getDocumentByIdForUser({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        documentId: "doc-1",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "NOT_WORKSPACE_MEMBER");
      return true;
    },
  );
});

test("documents service updates metadata with folder/status/title", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({ id: "doc-1" }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "doc-1",
        workspaceId: "ws-1",
        folderId: data.folderId,
        title: data.title,
        status: data.status,
        templateId: null,
        templateVersion: null,
        updatedAt: new Date("2026-05-08T00:00:00.000Z"),
      }),
    },
    folder: {
      findFirst: async () => ({ id: "folder-2" }),
    },
  };

  const service = new DocumentsService(prisma as never);
  const updated = await service.updateDocumentMetadata({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    title: "Renamed Doc",
    folderId: "folder-2",
    status: "submitted",
  });

  assert.equal(updated.title, "Renamed Doc");
  assert.equal(updated.status, "submitted");
});

test("documents service updates content and creates a version", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        workspaceId: "ws-1",
        status: "draft",
        properties: null,
        contentYjs: Buffer.from("old"),
      }),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        documentVersion: {
          findFirst: async () => ({ versionNumber: 4 }),
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: "ver-5",
            versionNumber: data.versionNumber,
            reason: data.reason,
            createdAt: new Date("2026-05-08T00:00:00.000Z"),
          }),
        },
        document: {
          update: async () => ({
            id: "doc-1",
            workspaceId: "ws-1",
            title: "Doc A",
            status: "draft",
            templateId: null,
            templateVersion: null,
            updatedAt: new Date("2026-05-08T00:00:00.000Z"),
          }),
        },
      }),
  };

  const service = new DocumentsService(prisma as never);
  const result = await service.updateDocumentContent({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    contentPlaintext: "Updated content body",
    reason: "manual_edit",
  });

  assert.equal(result.version.versionNumber, 5);
  assert.equal(result.document.id, "doc-1");
});

test("documents service enforces required template block types on content update", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        workspaceId: "ws-1",
        status: "draft",
        properties: {
          template: {
            properties: {
              enforcement: {
                requiredBlockTypes: ["cover-page", "section"],
              },
            },
          },
        },
        contentYjs: Buffer.from("old"),
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  await assert.rejects(
    () =>
      service.updateDocumentContent({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        documentId: "doc-1",
        contentPlaintext: "Updated content body",
        reason: "manual_edit",
        blockTypes: ["section"],
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "VALIDATION_ERROR");
      return true;
    },
  );
});

test("documents service submits draft document", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "MEMBER",
        workspace: { id: "ws-1", type: "academic", status: "active" },
      }),
      count: async () => 1,
    },
    user: {
      findUnique: async () => ({
        id: "user-1",
        fullName: "Alice",
        avatarUrl: null,
        email: "alice@example.com",
        globalRole: "USER",
      }),
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        title: "Doc A",
        status: "draft",
        contentPlaintext: "Body",
      }),
    },
    documentVersion: {
      findFirst: async () => ({ id: "ver-1" }),
    },
    activityEvent: {
      create: async () => ({ id: "act-1" }),
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        documentVersion: {
          findFirst: async () => ({
            id: "ver-1",
            versionNumber: 1,
            yjsState: Buffer.from("state"),
            plaintext: "Body",
          }),
          create: async () => ({ id: "ver-2" }),
        },
        document: {
          update: async () => ({
            id: "doc-1",
            status: "submitted",
            updatedAt: new Date("2026-05-08T00:00:00.000Z"),
          }),
        },
        documentSubmission: {
          create: async () => ({
            id: "sub-1",
            decision: null,
            submittedAt: new Date("2026-05-08T00:00:00.000Z"),
          }),
        },
      }),
  };

  const service = new DocumentsService(prisma as never);
  const transitioned = await service.transitionDocumentStatus({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    action: "submit",
  });

  assert.equal(transitioned.document.status, "submitted");
});

test("documents service blocks approve for non-review role", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "MEMBER",
        workspace: { id: "ws-1", type: "academic", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        title: "Doc A",
        status: "submitted",
        contentPlaintext: "Body",
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  await assert.rejects(
    () =>
      service.transitionDocumentStatus({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        documentId: "doc-1",
        action: "approve",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "INSUFFICIENT_ROLE");
      return true;
    },
  );
});

test("documents service rejects submit without supervisor in academic workspace", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "MEMBER",
        workspace: { id: "ws-1", type: "academic", status: "active" },
      }),
      count: async () => 0,
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        title: "Doc A",
        status: "draft",
        contentPlaintext: "Body",
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  await assert.rejects(
    () =>
      service.transitionDocumentStatus({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        documentId: "doc-1",
        action: "submit",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "NO_SUPERVISOR_ASSIGNED");
      return true;
    },
  );
});
