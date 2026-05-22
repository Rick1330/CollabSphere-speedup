import type { Extension } from "@hocuspocus/server";
import type { RedisClientType } from "redis";
import * as Y from "yjs";

import { prisma } from "../lib/prisma.js";

const DEBOUNCE_MS = 5_000;
const MAX_WAIT_MS = 30_000;
const isDev = process.env.NODE_ENV !== "production";

type PendingSave = {
  timer: NodeJS.Timeout;
  document: Y.Doc;
  documentId: string;
  updatedById: string | undefined;
  scheduledAt: number;
};

const pendingSaves = new Map<string, PendingSave>();

const extractPlaintext = (ydoc: Y.Doc): string => {
  const fragment = ydoc.getXmlFragment("default");
  const lines: string[] = [];

  const walk = (
    node: Y.XmlFragment | Y.AbstractType<unknown> | Y.XmlText,
  ): void => {
    if (node instanceof Y.XmlText) {
      const text = node.toString().trim();
      if (text) {
        lines.push(text);
      }
      return;
    }

    if (node instanceof Y.XmlElement) {
      const name = node.nodeName;
      if (name === "instructionText") {
        return;
      }

      if (name === "fillableField") {
        const value = node.getAttribute("value");
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) {
            lines.push(trimmed);
          }
        }
      }

      node.toArray().forEach((child) => {
        walk(child as unknown as Y.AbstractType<unknown> | Y.XmlText);
      });
      return;
    }

    if (node instanceof Y.XmlFragment) {
      node.toArray().forEach((child) => {
        walk(child as unknown as Y.AbstractType<unknown> | Y.XmlText);
      });
    }
  };

  walk(fragment);
  return lines.join("\n").trim();
};

const persistDocument = async (
  save: Omit<PendingSave, "timer">,
  redisClient: RedisClientType,
): Promise<void> => {
  const state = Buffer.from(Y.encodeStateAsUpdate(save.document));
  const plaintext = extractPlaintext(save.document);

  await prisma.document.update({
    where: { id: save.documentId },
    data: {
      contentYjs: state,
      contentPlaintext: plaintext,
      updatedAt: new Date(),
      updatedById: save.updatedById ?? null,
    },
  });

  void redisClient
    .lPush(
      "queue:search-index",
      JSON.stringify({
        type: "search.document.index",
        data: { documentId: save.documentId },
      }),
    )
    .catch((err) => console.warn("[persistence] Redis push failed", err));
};

export const createPersistenceExtension = (input: {
  redis: RedisClientType;
}): Extension => {
  const redisClient = input.redis;

  return {
    async onLoadDocument(data) {
      const { document, documentName } = data as {
        document: Y.Doc;
        documentName: string;
      };
      const documentId = documentName.replace("doc:", "");

      let dbDoc:
        | {
            contentYjs: Uint8Array | Buffer;
          }
        | null;
      try {
        dbDoc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { contentYjs: true },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[persistence] Failed to load document", { documentId, message });
        throw new Error(`Failed to load document: ${message}`);
      }

      if (!dbDoc) {
        throw new Error(`Document ${documentId} not found`);
      }

      const contentYjs = dbDoc.contentYjs;
      if (contentYjs && contentYjs.length > 0) {
        try {
          Y.applyUpdate(document, new Uint8Array(contentYjs));
        } catch (err) {
          console.error("[persistence] Document state corrupted", { documentId, err });
          throw new Error("DOCUMENT_STATE_CORRUPTED");
        }
      }

      if (isDev) {
        console.info("[collab][persistence] loaded", {
          documentId,
          bytes: contentYjs?.length ?? 0,
        });
      }
    },

    async onStoreDocument(data) {
      const { document, documentName } = data as {
        document: Y.Doc;
        documentName: string;
      };
      const documentId = documentName.replace("doc:", "");
      const updatedById = (data as any)?.context?.userId as string | undefined;
      const now = Date.now();

      const existing = pendingSaves.get(documentId);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const firstScheduledAt = existing?.scheduledAt ?? now;
      const waitedMs = now - firstScheduledAt;
      const remainingMaxWaitMs = Math.max(0, MAX_WAIT_MS - waitedMs);
      const delay = Math.min(DEBOUNCE_MS, remainingMaxWaitMs);

      const timer = setTimeout(() => {
        const save = pendingSaves.get(documentId);
        if (!save) return;
        pendingSaves.delete(documentId);

        const { timer: _timer, ...savePayload } = save;
        void persistDocument(savePayload, redisClient).catch((err) => {
          console.error("[persistence] Save failed", err);
        });
      }, delay);

      pendingSaves.set(documentId, {
        timer,
        document,
        documentId,
        updatedById,
        scheduledAt: firstScheduledAt,
      });
    },

    async onDestroy() {
      console.info("[persistence] Flushing pending saves", { count: pendingSaves.size });

      const saves = Array.from(pendingSaves.values());
      pendingSaves.clear();

      await Promise.allSettled(
        saves.map((save) => {
          clearTimeout(save.timer);
          const { timer: _timer, ...savePayload } = save;
          return persistDocument(savePayload, redisClient).catch((err) => {
            console.error("[persistence] Flush failed", err);
            throw err;
          });
        }),
      );

      console.info("[persistence] All saves flushed");
    },
  };
};

