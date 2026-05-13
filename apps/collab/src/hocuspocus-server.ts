import type { DocumentStatus, WorkspaceRole } from "@prisma/client";
import { Server, type onAuthenticatePayload, type onLoadDocumentPayload, type onStoreDocumentPayload } from "@hocuspocus/server";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import jwt from "jsonwebtoken";
import { isDocumentReadOnly } from "../../../packages/shared/src/collab/document-write-policy.js";

const roomPrefix = "doc:";

export type CollabContext = {
  userId: string;
  workspaceId: string;
  documentId: string;
  readOnly: boolean;
};

export type CollabDocumentRecord = {
  id: string;
  workspaceId: string;
  status: DocumentStatus;
  isLocked: boolean;
  deletedAt: Date | null;
  contentYjs: Uint8Array;
};

export interface CollabPersistenceAdapter {
  findDocumentForAccess(input: { documentId: string; userId: string }): Promise<{
    role: WorkspaceRole;
    document: CollabDocumentRecord | null;
  }>;
  findDocumentById(input: { documentId: string }): Promise<Pick<CollabDocumentRecord, "contentYjs"> | null>;
  persistDocument(input: {
    documentId: string;
    updatedById: string;
    contentYjs: Uint8Array;
    contentPlaintext: string;
    updatedAt: Date;
  }): Promise<void>;
  persistUpdate(input: {
    documentId: string;
    workspaceId: string;
    update: Uint8Array;
  }): Promise<void>;
}

const parseRoomDocumentId = (roomName: string) => {
  if (!roomName.startsWith(roomPrefix)) {
    throw new Error("Invalid room name. Expected doc:<documentId>.");
  }

  const documentId = roomName.slice(roomPrefix.length).trim();
  if (!documentId) {
    throw new Error("Document id is required.");
  }

  return documentId;
};

const resolveCollabJwtClaims = (token: string, secret: string) => {
  const payload = jwt.verify(token, secret);
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid collaboration token payload.");
  }

  const subject =
    (typeof payload.sub === "string" && payload.sub) ||
    (typeof payload.userId === "string" && payload.userId) ||
    null;
  if (!subject) {
    throw new Error("Collaboration token does not contain subject.");
  }

  return {
    userId: subject,
    workspaceId:
      typeof payload.workspaceId === "string" && payload.workspaceId.trim()
        ? payload.workspaceId.trim()
        : null,
    documentId:
      typeof payload.documentId === "string" && payload.documentId.trim()
        ? payload.documentId.trim()
        : null,
  };
};

const collectText = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectText);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectText);
  }

  return [];
};

const extractPlaintext = (state: Uint8Array) => {
  const doc = new Doc();
  applyUpdate(doc, state);
  const fragments = collectText(doc.toJSON());

  doc.share.forEach((value) => {
    if (typeof (value as { toString?: () => string }).toString === "function") {
      const serialized = value.toString();
      const trimmed = serialized.trim();
      if (trimmed && !trimmed.startsWith("[object ")) {
        fragments.push(trimmed);
      }
    }
  });

  if (fragments.length === 0) {
    const fallback = JSON.stringify(doc.toJSON());
    if (fallback && fallback !== "{}") {
      fragments.push(fallback);
    }
  }

  doc.destroy();
  return fragments.join(" ").slice(0, 20_000);
};

export const createCollabHooks = (input: {
  adapter: CollabPersistenceAdapter;
  jwtSecret: string;
}) => {
  const onAuthenticate = async ({
    token,
    documentName,
    connectionConfig,
    context,
  }: onAuthenticatePayload<Partial<CollabContext>>) => {
    const startedAt = process.hrtime.bigint();
    const documentId = parseRoomDocumentId(documentName);
    const claims = resolveCollabJwtClaims(token, input.jwtSecret);
    const userId = claims.userId;
    const access = await input.adapter.findDocumentForAccess({
      documentId,
      userId,
    });

    if (!access.document || access.document.deletedAt) {
      throw new Error("Document not found.");
    }
    if (claims.workspaceId && claims.workspaceId !== access.document.workspaceId) {
      throw new Error("Workspace token claim does not match requested document.");
    }
    if (claims.documentId && claims.documentId !== documentId) {
      throw new Error("Document token claim does not match requested room.");
    }

    const readOnly = isDocumentReadOnly({
      status: access.document.status,
      isLocked: access.document.isLocked,
      role: access.role,
    });

    connectionConfig.isAuthenticated = true;
    connectionConfig.readOnly = readOnly;
    context.userId = userId;
    context.workspaceId = access.document.workspaceId;
    context.documentId = documentId;
    context.readOnly = readOnly;
    console.info(
      JSON.stringify({
        event: "collab.authenticate.ok",
        userId,
        workspaceId: access.document.workspaceId,
        documentId,
        latencyMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
      }),
    );
  };

  const onUpdate = async ({
    documentName,
    update,
    context,
  }: {
    documentName: string;
    update: Uint8Array;
    context: CollabContext;
  }) => {
    const documentId = parseRoomDocumentId(documentName);
    await input.adapter.persistUpdate({
      documentId,
      workspaceId: context.workspaceId,
      update,
    });
  };

  const onLoadDocument = async ({ documentName }: onLoadDocumentPayload<CollabContext>) => {
    const startedAt = process.hrtime.bigint();
    const documentId = parseRoomDocumentId(documentName);
    const record = await input.adapter.findDocumentById({ documentId });
    console.info(
      JSON.stringify({
        event: "collab.document.load",
        documentId,
        found: Boolean(record),
        latencyMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
      }),
    );
    return record?.contentYjs ?? new Uint8Array(0);
  };

  const onStoreDocument = async ({
    document,
    documentName,
    lastContext,
  }: onStoreDocumentPayload<CollabContext>) => {
    const startedAt = process.hrtime.bigint();
    const documentId = parseRoomDocumentId(documentName);
    const state = encodeStateAsUpdate(document);
    await input.adapter.persistDocument({
      documentId,
      updatedById: lastContext.userId,
      contentYjs: state,
      contentPlaintext: extractPlaintext(state),
      updatedAt: new Date(),
    });
    console.info(
      JSON.stringify({
        event: "collab.document.persist",
        documentId,
        userId: lastContext.userId,
        workspaceId: lastContext.workspaceId,
        latencyMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
      }),
    );
  };

  return {
    onAuthenticate,
    onLoadDocument,
    onStoreDocument,
    onUpdate,
  };
};

export const createCollabServer = (input: {
  adapter: CollabPersistenceAdapter;
  jwtSecret: string;
  host: string;
  port: number;
}) => {
  const hooks = createCollabHooks({
    adapter: input.adapter,
    jwtSecret: input.jwtSecret,
  });

  return new Server<Partial<CollabContext>>({
    name: "collab",
    address: input.host,
    port: input.port,
    debounce: 2500,
    maxDebounce: 5000,
    quiet: true,
    ...hooks,
    onRequest: async ({ request, response }) => {
      if (request.url === "/" || request.url === "/health") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ service: "collab", status: "ok", mode: "hocuspocus" }));
        throw null;
      }

      response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ code: "NOT_FOUND" }));
      throw null;
    },
    onDisconnect: async ({ instance }) => {
      instance.flushPendingStores();
    },
  });
};
