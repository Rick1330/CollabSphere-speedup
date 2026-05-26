import type { Extension } from "@hocuspocus/server";
import type { RedisClientType } from "redis";
import * as Y from "yjs";

const CACHE_TTL_SECONDS = 3_600;
const cacheKey = (documentName: string) => `ydoc:cache:${documentName}`;

export const createRedisYdocCacheExtension = (input: {
  redis: RedisClientType;
}): Extension => {
  const redis = input.redis;

  return {
    async onLoadDocument(data) {
      const { documentName, document } = data as {
        documentName: string;
        document: Y.Doc;
      };

      if (document.share.size > 0) {
        return;
      }

      try {
        const cached = await redis.getBuffer(cacheKey(documentName));
        if (!cached || cached.length === 0) return;

        Y.applyUpdate(document, new Uint8Array(cached));
        if (process.env.NODE_ENV !== "production") {
          console.info("[collab][redis-cache] warm load", {
            documentName,
            bytes: cached.length,
          });
        }
      } catch (err) {
        console.warn("[collab][redis-cache] load failed", { documentName, err });
      }
    },

    async onStoreDocument(data) {
      const { documentName, document } = data as {
        documentName: string;
        document: Y.Doc;
      };

      try {
        const update = Buffer.from(Y.encodeStateAsUpdate(document));
        await redis.setEx(cacheKey(documentName), CACHE_TTL_SECONDS, update);
      } catch (err) {
        console.warn("[collab][redis-cache] store failed", { documentName, err });
      }
    },

    async onUnloadDocument(data) {
      const documentName = (data as { documentName: string }).documentName;
      try {
        await redis.del(cacheKey(documentName));
      } catch {
        // ignore
      }
    },
  };
};
