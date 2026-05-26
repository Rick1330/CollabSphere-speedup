import { createClient, type RedisClientType } from "redis";
import {
  DOCUMENT_RESTORED_CHANNEL,
  type DocumentRestoredMessage,
} from "../../../../../packages/shared/src/collab/document-restore-channel.js";

let publisher: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

async function getPublisher(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (publisher?.isOpen) return publisher;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const client = createClient({ url }) as RedisClientType;
        client.on("error", (err) => {
          console.warn("[api][redis] publish client error", err);
        });
        await client.connect();
        publisher = client;
        return client;
      } catch (err) {
        console.warn("[api][redis] could not connect for document restore publish", err);
        connectPromise = null;
        return null;
      }
    })();
  }

  return connectPromise;
}

export async function publishDocumentRestored(documentId: string): Promise<void> {
  const connectWithTimeout = async (): Promise<RedisClientType | null> => {
    const timeoutMs = 2_000;
    return Promise.race([
      getPublisher(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  };

  const client = await connectWithTimeout();
  if (!client) return;

  const payload: DocumentRestoredMessage = { documentId };
  try {
    await client.publish(DOCUMENT_RESTORED_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    console.warn("[api][redis] publish document restored failed", { documentId, err });
  }
}
