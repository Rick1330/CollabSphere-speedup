import type { Extension, Hocuspocus } from "@hocuspocus/server";
import {
  DOCUMENT_RESTORED_CHANNEL,
  parseDocumentRestoredMessage,
} from "../../../../packages/shared/src/collab/document-restore-channel.js";
import { getRedis } from "../lib/redis.js";
import { discardPendingSave } from "./persistence.extension.js";

const documentRoomName = (documentId: string) => `doc:${documentId}`;

async function reloadDocumentFromDatabase(
  hocuspocus: Hocuspocus,
  documentId: string,
): Promise<void> {
  discardPendingSave(documentId);

  const documentName = documentRoomName(documentId);
  const loaded = hocuspocus.documents.get(documentName);
  if (!loaded || loaded.isDestroyed) {
    return;
  }

  hocuspocus.closeConnections(documentName);
  await hocuspocus.unloadDocument(loaded);

  console.info("[collab][document-restore] unloaded in-memory document; next connect loads from DB", {
    documentId,
  });
}

export const createDocumentRestoreExtension = (): Extension => {
  let hocuspocus: Hocuspocus | null = null;

  return {
    async onConfigure({ instance }) {
      hocuspocus = instance;

      const redis = await getRedis();
      const subscriber = redis.duplicate();
      subscriber.on("error", (err) => {
        console.warn("[collab][document-restore] subscriber error", err);
      });
      await subscriber.connect();
      await subscriber.subscribe(DOCUMENT_RESTORED_CHANNEL, async (message) => {
        const parsed = parseDocumentRestoredMessage(message);
        if (!parsed || !hocuspocus) return;
        try {
          await reloadDocumentFromDatabase(hocuspocus, parsed.documentId);
        } catch (err) {
          console.error("[collab][document-restore] reload failed", {
            documentId: parsed.documentId,
            err,
          });
        }
      });

      console.info("[collab][document-restore] subscribed to", DOCUMENT_RESTORED_CHANNEL);
    },

    async onDestroy() {
      hocuspocus = null;
    },
  };
};
