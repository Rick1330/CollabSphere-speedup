import "./config/validate-env.js";
import { Server } from "@hocuspocus/server";
import { prisma } from "./lib/prisma.js";
import { disconnectRedis, getRedis } from "./lib/redis.js";
import { authExtension } from "./extensions/auth.extension.js";
import { autoVersionExtension } from "./extensions/auto-version.extension.js";
import { createPersistenceExtension } from "./extensions/persistence.extension.js";
import { createRedisYdocCacheExtension } from "./extensions/redis-ydoc-cache.extension.js";
import { createDocumentRestoreExtension } from "./extensions/document-restore.extension.js";

const host = process.env.HOST ?? "127.0.0.1";
/** Never use root PORT (API 3001) for collab. */
const port = Number.parseInt(process.env.COLLAB_PORT ?? "3002", 10) || 3002;

let server: Server | null = null;

let isShuttingDown = false;

const shutdown = async (_signal: NodeJS.Signals): Promise<void> => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  try {
    await server?.destroy();
  } catch (error) {
    console.error("[collab] Error while destroying server", error);
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("[collab] Error while disconnecting Prisma", error);
  }

  try {
    await disconnectRedis();
  } catch (error) {
    console.error("[collab] Error while disconnecting Redis", error);
  }

  console.info("[collab] Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

const bootstrap = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[collab] Database connection failed", error);
    process.exit(1);
  }

  let redisClient: Awaited<ReturnType<typeof getRedis>>;
  try {
    redisClient = await getRedis();
  } catch (error) {
    console.error("[collab] Redis connection failed", error);
    await prisma.$disconnect();
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === "production";

  server = new Server({
    name: "collab",
    address: host,
    port,
    quiet: isProduction,
    stopOnSignals: false,
    extensions: [
      authExtension,
      createPersistenceExtension({ redis: redisClient }),
      createRedisYdocCacheExtension({ redis: redisClient }),
      createDocumentRestoreExtension(),
      autoVersionExtension,
    ],
    onConnect: async ({ documentName }) => {
      if (!isProduction) {
        console.info("[collab] client connecting", { documentName });
      }
    },
    onDisconnect: async ({ documentName }) => {
      if (!isProduction) {
        console.info("[collab] client disconnected", { documentName });
      }
    },
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
  });

  await server.listen();
  const listeningPort = server.address?.port ?? port;
  console.info(`[collab] Server listening on port ${listeningPort}`);
};

void bootstrap().catch(async (error) => {
  console.error("[collab] Failed to start server", error);
  await prisma.$disconnect();
  await disconnectRedis();
  process.exit(1);
});
