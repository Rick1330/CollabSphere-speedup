import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";

const EXPORT_DIR = path.resolve(process.cwd(), ".tmp", "exports");

const toMarkdown = (input: string) =>
  input
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();

export const processExportJob = async (
  job: Job<{ exportJobId: string }>,
  deps: { prisma: PrismaClient },
) => {
  const exportJob = await deps.prisma.exportJob.findFirst({
    where: { id: job.data.exportJobId, deletedAt: null },
  });
  if (!exportJob) {
    return { skipped: true };
  }
  if (exportJob.status === "completed" && exportJob.outputStorageKey) {
    return { skipped: true, reason: "already_completed", storageKey: exportJob.outputStorageKey };
  }
  await deps.prisma.exportJob.update({
    where: { id: exportJob.id },
    data: { status: "processing" },
  });
  try {
    const doc = await deps.prisma.document.findFirst({
      where: { id: exportJob.resourceId, deletedAt: null },
      select: { id: true, title: true, contentPlaintext: true },
    });
    if (!doc) {
      throw new Error("Document not found for export.");
    }
    await fs.mkdir(EXPORT_DIR, { recursive: true });
    const ext = exportJob.format === "pdf" ? "pdf" : "md";
    const filename = `${exportJob.id}.${ext}`;
    const storageKey = path.join("exports", filename);
    const filePath = path.join(EXPORT_DIR, filename);
    const content =
      exportJob.format === "pdf"
        ? `PDF EXPORT\n\n${doc.title}\n\n${doc.contentPlaintext}`
        : toMarkdown(`<h1>${doc.title}</h1><p>${doc.contentPlaintext}</p>`);
    await fs.writeFile(filePath, content, "utf8");
    await deps.prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "completed",
        outputStorageKey: storageKey,
        completedAt: new Date(),
      },
    });
    return { storageKey };
  } catch (error) {
    await deps.prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown export error",
      },
    });
    throw error;
  }
};
