import type { Extension } from "@hocuspocus/server";
import * as Y from "yjs";
import { prisma } from "../lib/prisma.js";
import { extractPlaintextFromYdoc } from "../lib/extract-plaintext.js";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const DISCONNECT_MIN_GAP_MS = 60 * 1000;
const isDev = process.env.NODE_ENV !== "production";

const resolveIntervalMs = (): number => {
  const raw = process.env.AUTO_VERSION_INTERVAL_MS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return isDev ? 60 * 1000 : DEFAULT_INTERVAL_MS;
};

const intervalMs = resolveIntervalMs();
const lastVersionTime = new Map<string, number>();

const parseDocumentId = (documentName: string): string | null => {
  if (!documentName.startsWith("doc:")) return null;
  const documentId = documentName.slice(4).trim();
  return documentId.length > 0 ? documentId : null;
};

type CollabContext = {
  userId?: string;
  workspaceId?: string;
  documentId?: string;
};

const toPrismaBytes = (data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Uint8Array(buffer);
};

async function createVersionSnapshot(input: {
  documentId: string;
  workspaceId: string;
  ydoc: Y.Doc;
  triggeredBy?: string;
  reason: string;
}): Promise<void> {
  const state = Y.encodeStateAsUpdate(input.ydoc);
  const plaintext = extractPlaintextFromYdoc(input.ydoc);

  const latest = await prisma.documentVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      workspaceId: input.workspaceId,
      versionNumber,
      reason: input.reason,
      yjsState: toPrismaBytes(state),
      plaintext: plaintext || null,
      createdById: input.triggeredBy ?? null,
    },
  });

  console.info("[auto-version] Snapshot created", {
    documentId: input.documentId,
    versionNumber,
    reason: input.reason,
  });
}

async function maybeSnapshot(
  documentName: string,
  document: Y.Doc,
  context: CollabContext | undefined,
  reason: string,
  minGapMs: number,
): Promise<void> {
  const documentId = parseDocumentId(documentName);
  if (!documentId) return;

  const now = Date.now();
  const last = lastVersionTime.get(documentId) ?? 0;
  if (now - last < minGapMs) return;

  let workspaceId = context?.workspaceId;
  if (!workspaceId) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });
    workspaceId = doc?.workspaceId;
  }
  if (!workspaceId) return;

  lastVersionTime.set(documentId, now);

  await createVersionSnapshot({
    documentId,
    workspaceId,
    ydoc: document,
    triggeredBy: context?.userId,
    reason,
  });
}

function scheduleSnapshot(
  documentName: string,
  document: Y.Doc,
  context: CollabContext | undefined,
  reason: string,
  minGapMs: number,
): void {
  void maybeSnapshot(documentName, document, context, reason, minGapMs).catch((err) => {
    const documentId = parseDocumentId(documentName);
    console.error("[auto-version] Failed to create snapshot", {
      documentId,
      err,
    });
  });
}

type StoreDocumentPayload = {
  document: Y.Doc;
  documentName: string;
  context?: CollabContext;
};

export const autoVersionExtension: Extension = {
  async onStoreDocument(data) {
    const payload = data as unknown as StoreDocumentPayload;
    const context = (data as { context?: CollabContext }).context;
    scheduleSnapshot(payload.documentName, payload.document, context, "auto", intervalMs);
  },

  async onDisconnect(data) {
    const payload = data as unknown as StoreDocumentPayload;
    const context = (data as { context?: CollabContext }).context;
    scheduleSnapshot(
      payload.documentName,
      payload.document,
      context,
      "auto",
      DISCONNECT_MIN_GAP_MS,
    );
  },

  async onDestroy() {
    lastVersionTime.clear();
    if (isDev) {
      console.info("[auto-version] Extension destroyed");
    }
  },
};
