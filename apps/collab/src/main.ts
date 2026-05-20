import "./config/validate-env.js";
import { Server } from "@hocuspocus/server";
import { prisma } from "./lib/prisma.js";
import { disconnectRedis, getRedis } from "./lib/redis.js";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.COLLAB_PORT ?? process.env.PORT ?? "3002", 10) || 3002;

const server = new Server({
  name: "collab",
  address: host,
  port,
  quiet: true,
  stopOnSignals: false,
  extensions: [],
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

let isShuttingDown = false;

const shutdown = async (_signal: NodeJS.Signals): Promise<void> => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  try {
    await server.destroy();
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

  try {
    await getRedis();
  } catch (error) {
    console.error("[collab] Redis connection failed", error);
    await prisma.$disconnect();
    process.exit(1);
  }

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
