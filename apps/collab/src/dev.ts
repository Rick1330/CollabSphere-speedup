import { PrismaClient } from "@prisma/client";
import { parseServicePort, validateServiceEnv } from "../../../packages/shared/src/bootstrap-runtime.js";
import { EnvValidationError, parseRuntimeEnv } from "../../../packages/shared/src/runtime-env.js";
import { createCollabServer } from "./hocuspocus-server.js";

const runtimeEnv = validateServiceEnv({
  service: "collab",
  parser: parseRuntimeEnv,
  validationErrorClass: EnvValidationError,
});

const host = process.env.HOST ?? "127.0.0.1";
const port = parseServicePort({
  service: "collab",
  fallback: 3002,
});

const prisma = new PrismaClient({
  datasourceUrl: runtimeEnv.COLLAB_DATABASE_URL,
});

const toPrismaBytes = (data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Uint8Array(buffer);
};

const collabServer = createCollabServer({
  jwtSecret: runtimeEnv.COLLAB_JWT_SECRET,
  host,
  port,
  adapter: {
    async findDocumentForAccess({ documentId, userId }) {
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          isActive: true,
          deletedAt: null,
          workspace: {
            deletedAt: null,
            documents: {
              some: {
                id: documentId,
                deletedAt: null,
              },
            },
          },
        },
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              documents: {
                where: {
                  id: documentId,
                  deletedAt: null,
                },
                select: {
                  id: true,
                  workspaceId: true,
                  status: true,
                  isLocked: true,
                  deletedAt: true,
                  contentYjs: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      return {
        role: membership?.role ?? "VIEWER",
        document: membership?.workspace.documents[0] ?? null,
      };
    },
    async findDocumentById({ documentId }) {
      return prisma.document.findFirst({
        where: {
          id: documentId,
          deletedAt: null,
        },
        select: {
          contentYjs: true,
        },
      });
    },
    async persistDocument({ documentId, updatedById, contentYjs, contentPlaintext, updatedAt }) {
      await prisma.$transaction(async (tx) => {
        const latestVersion = await tx.documentVersion.findFirst({
          where: { documentId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

        await tx.document.update({
          where: {
            id: documentId,
          },
          data: {
            contentYjs: toPrismaBytes(contentYjs),
            contentPlaintext,
            updatedAt,
            updatedById,
          },
        });

        await tx.documentVersion.create({
          data: {
            documentId,
            workspaceId: (
              await tx.document.findUniqueOrThrow({
                where: { id: documentId },
                select: { workspaceId: true },
              })
            ).workspaceId,
            versionNumber: nextVersion,
            reason: "collab_sync",
            yjsState: toPrismaBytes(contentYjs),
            plaintext: contentPlaintext,
            createdById: updatedById,
            createdAt: updatedAt,
          },
        });
      });
    },
    async persistUpdate({ documentId, workspaceId, update }) {
      await prisma.documentUpdate.create({
        data: {
          documentId,
          workspaceId,
          update: toPrismaBytes(update),
        },
      });
    },
  },
});

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`[collab] received ${signal}, shutting down`);
  await collabServer.destroy();
  await prisma.$disconnect();
  process.exit(0);
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void collabServer
  .listen()
  .then(() => {
    console.log(`[collab] bootstrap listening on http://${host}:${collabServer.address.port}/health`);
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[collab] failed to start: ${message}`);
    await prisma.$disconnect();
    process.exit(1);
  });
