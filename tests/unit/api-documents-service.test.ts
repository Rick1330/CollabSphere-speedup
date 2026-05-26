import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
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

test("documents service publishes realtime event after activity creation", async () => {
  let published = false;
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
    activityEvent: {
      create: async () => ({
        id: "act-1",
        workspaceId: "ws-1",
        actorId: "user-1",
        actorNameSnapshot: "Alice",
        actorAvatarSnapshot: null,
        eventKey: "document.submitted",
        summary: "Alice submitted Doc A",
        resourceType: "document",
        resourceId: "doc-1",
        resourceTitleSnapshot: "Doc A",
        metadata: {},
        createdAt: new Date("2026-05-08T00:00:00.000Z"),
      }),
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
  const realtimeEvents = {
    emitActivityFromRecord: () => {
      published = true;
    },
  };
  const service = new DocumentsService(prisma as never, realtimeEvents as never);
  await service.transitionDocumentStatus({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    action: "submit",
  });
  assert.equal(published, true);
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

test("documents service lists document versions with char counts", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({ id: "doc-1" }),
    },
    documentVersion: {
      findMany: async () => [
        {
          id: "ver-2",
          documentId: "doc-1",
          versionNumber: 2,
          reason: "auto",
          createdAt: new Date("2026-05-08T01:00:00.000Z"),
          createdById: "user-1",
          plaintext: "Second snapshot body",
          yjsState: Buffer.from([1]),
          versionLabel: null,
          createdBy: { id: "user-1", fullName: "Alice" },
        },
        {
          id: "ver-1",
          documentId: "doc-1",
          versionNumber: 1,
          reason: "auto",
          createdAt: new Date("2026-05-08T00:00:00.000Z"),
          createdById: "user-1",
          plaintext: "First",
          yjsState: Buffer.from([1]),
          versionLabel: null,
          createdBy: { id: "user-1", fullName: "Alice" },
        },
      ],
    },
  };

  const service = new DocumentsService(prisma as never);
  const { items, total } = await service.listDocumentVersions({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
  });

  assert.equal(total, 2);
  assert.equal(items[0]?.id, "ver-2");
  assert.equal(items[0]?.charCount, "Second snapshot body".length);
  assert.equal(items[0]?.contentExcerpt, "Second snapshot body");
});

test("documents service returns version detail with yjs state", async () => {
  const yjsState = Buffer.from([9, 8, 7]);
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    documentVersion: {
      findFirst: async () => ({
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        reason: "auto",
        createdAt: new Date("2026-05-08T00:00:00.000Z"),
        createdById: "user-1",
        plaintext: "Snapshot",
        yjsState,
        versionLabel: "Named release",
        createdBy: { id: "user-1", fullName: "Alice" },
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  const detail = await service.getDocumentVersionDetail({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    versionId: "ver-1",
  });

  assert.equal(detail.id, "ver-1");
  assert.equal(detail.yjsStateBase64, Buffer.from(yjsState).toString("base64"));
  assert.equal(detail.plaintext, "Snapshot");
  assert.equal(detail.versionLabel, "Named release");
});

test("documents service backfills plaintext from yjs on detail when stored plaintext missing", async () => {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("prosemirror");
  const paragraph = new Y.XmlElement("paragraph");
  const xmlText = new Y.XmlText();
  xmlText.insert(0, "Recovered body");
  paragraph.insert(0, [xmlText]);
  fragment.insert(0, [paragraph]);
  const yjsState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    documentVersion: {
      findFirst: async () => ({
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        reason: "auto",
        createdAt: new Date("2026-05-08T00:00:00.000Z"),
        createdById: "user-1",
        plaintext: null,
        yjsState,
        versionLabel: null,
        createdBy: { id: "user-1", fullName: "Alice" },
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  const detail = await service.getDocumentVersionDetail({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    versionId: "ver-1",
  });

  assert.equal(detail.charCount, "Recovered body".length);
  assert.equal(detail.plaintext, "Recovered body");
  assert.ok(detail.yjsStateBase64.length > 0);
});

test("documents service detail survives corrupt yjs when backfilling plaintext", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    documentVersion: {
      findFirst: async () => ({
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        reason: "auto",
        createdAt: new Date("2026-05-08T00:00:00.000Z"),
        createdById: "user-1",
        plaintext: null,
        yjsState: Buffer.from([255, 0, 1]),
        versionLabel: null,
        createdBy: { id: "user-1", fullName: "Alice" },
      }),
    },
  };

  const service = new DocumentsService(prisma as never);
  const detail = await service.getDocumentVersionDetail({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    versionId: "ver-1",
  });

  assert.equal(detail.plaintext, "");
  assert.equal(detail.charCount, 0);
  assert.ok(detail.yjsStateBase64.length > 0);
});

test("documents service creates manual version from current document content", async () => {
  const yjsState = Buffer.from([1, 2, 3]);
  let createdPayload: Record<string, unknown> | null = null;
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "MEMBER",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({
        id: "doc-1",
        contentYjs: yjsState,
        contentPlaintext: "Current body",
        status: "draft",
        isLocked: false,
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        documentVersion: {
          findFirst: async () => ({ versionNumber: 2 }),
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdPayload = data;
            return {
              id: "ver-3",
              documentId: data.documentId,
              versionNumber: data.versionNumber,
              reason: data.reason,
              createdAt: new Date("2026-05-08T02:00:00.000Z"),
              createdById: data.createdById,
              versionLabel: data.versionLabel,
              plaintext: data.plaintext,
              createdBy: { id: "user-1", fullName: "Alice" },
            };
          },
        },
      };
      return fn(tx);
    },
  };

  const service = new DocumentsService(prisma as never);
  const created = await service.createManualDocumentVersion({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    versionLabel: "Before review",
  });

  assert.equal(created.versionNumber, 3);
  assert.equal(created.reason, "manual");
  assert.equal(created.versionLabel, "Before review");
  assert.equal(createdPayload?.reason, "manual");
  assert.equal(createdPayload?.plaintext, "Current body");
});

test("documents service list backfills excerpt from small yjs when plaintext empty", async () => {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("prosemirror");
  const paragraph = new Y.XmlElement("paragraph");
  const xmlText = new Y.XmlText();
  xmlText.insert(0, "List backfill text");
  paragraph.insert(0, [xmlText]);
  fragment.insert(0, [paragraph]);
  const yjsState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    document: {
      findFirst: async () => ({ id: "doc-1" }),
    },
    documentVersion: {
      findMany: async () => [
        {
          id: "ver-1",
          documentId: "doc-1",
          versionNumber: 1,
          reason: "auto",
          createdAt: new Date("2026-05-08T00:00:00.000Z"),
          createdById: "user-1",
          plaintext: null,
          yjsState,
          versionLabel: null,
          createdBy: { id: "user-1", fullName: "Alice" },
        },
      ],
    },
  };

  const service = new DocumentsService(prisma as never);
  const { items } = await service.listDocumentVersions({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
  });

  assert.equal(items[0]?.contentExcerpt, "List backfill text");
  assert.equal(items[0]?.charCount, "List backfill text".length);
});

test("documents service allows member to restore editable draft", async () => {
  const restoredYjs = Buffer.from([9, 9, 9]);
  let updatedContentYjs: unknown;
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "MEMBER",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        document: {
          findFirst: async () => ({
            id: "doc-1",
            status: "draft",
            isLocked: false,
            contentYjs: Buffer.from([1, 2]),
            contentPlaintext: "Current",
          }),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updatedContentYjs = data.contentYjs;
            return { id: "doc-1", updatedAt: new Date("2026-05-08T03:00:00.000Z") };
          },
        },
        documentVersion: {
          findFirst: async (args: { where?: { id?: string }; orderBy?: { versionNumber: string } }) => {
            if (args.where?.id === "ver-1") {
              return {
                id: "ver-1",
                yjsState: restoredYjs,
                plaintext: "Restored body",
              };
            }
            if (args.orderBy?.versionNumber === "desc") {
              return { versionNumber: 2 };
            }
            return null;
          },
          create: async () => ({ id: "ver-before" }),
        },
      };
      return fn(tx);
    },
  };

  const eventEmitter = { emit: () => undefined };
  const service = new DocumentsService(prisma as never, eventEmitter as never);
  const result = await service.restoreDocumentVersion({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    versionId: "ver-1",
  });

  assert.equal(result.id, "doc-1");
  assert.deepEqual(updatedContentYjs, restoredYjs);
});

test("documents service rejects restore when document is read-only for viewer", async () => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        id: "m-1",
        role: "VIEWER",
        workspace: { id: "ws-1", type: "professional", status: "active" },
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        document: {
          findFirst: async () => ({
            id: "doc-1",
            status: "draft",
            isLocked: false,
            contentYjs: Buffer.from([1]),
            contentPlaintext: "Current",
          }),
        },
        documentVersion: {
          findFirst: async () => ({
            id: "ver-1",
            yjsState: Buffer.from([9]),
            plaintext: "Old",
          }),
        },
      };
      return fn(tx);
    },
  };

  const eventEmitter = { emit: () => undefined };
  const service = new DocumentsService(prisma as never, eventEmitter as never);

  await assert.rejects(
    () =>
      service.restoreDocumentVersion({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        documentId: "doc-1",
        versionId: "ver-1",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "DOCUMENT_READONLY_STATUS");
      return true;
    },
  );
});
