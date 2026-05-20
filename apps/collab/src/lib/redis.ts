import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export const getRedis = async (): Promise<RedisClientType> => {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!connectPromise) {
    const client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    client.on("error", (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[redis] Client error: ${message}`);
    });
    client.on("reconnecting", () => {
      console.warn("[redis] Reconnecting...");
    });

    connectPromise = client
      .connect()
      .then(() => {
        redisClient = client;
        return client;
      })
      .catch((error) => {
        connectPromise = null;
        throw error;
      });
  }

  return connectPromise;
};

export const disconnectRedis = async (): Promise<void> => {
  connectPromise = null;

  if (!redisClient?.isOpen) {
    redisClient = null;
    return;
  }

  await redisClient.quit();
  redisClient = null;
};
