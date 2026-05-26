import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";

const EXPORT_DIR = path.resolve(process.cwd(), ".tmp", "exports");
const execFileAsync = promisify(execFile);
const SOFFICE_CANDIDATES = [
  "soffice",
  "libreoffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
];

const toMarkdown = (input: string) =>
  input
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();

function resolveRichDocumentHtml(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") return null;
  const map = properties as Record<string, unknown>;
  const html =
    (typeof map.richDocumentHtml === "string" && map.richDocumentHtml) ||
    (typeof map.contentHtml === "string" && map.contentHtml) ||
    (typeof map.html === "string" && map.html) ||
    null;
  return html && html.trim().length > 0 ? html : null;
}

async function runLibreOfficeToPdf(inputPath: string, outDir: string): Promise<void> {
  let lastError: unknown;
  for (const bin of SOFFICE_CANDIDATES) {
    try {
      await execFileAsync(
        bin,
        ["--headless", "--convert-to", "pdf", "--outdir", outDir, inputPath],
        { timeout: 120_000 },
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

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
      select: { id: true, title: true, contentPlaintext: true, properties: true },
    });
    if (!doc) {
      throw new Error("Document not found for export.");
    }
    await fs.mkdir(EXPORT_DIR, { recursive: true });
    const ext = exportJob.format === "pdf" ? "pdf" : "md";
    const filename = `${exportJob.id}.${ext}`;
    const storageKey = path.join("exports", filename);
    const filePath = path.join(EXPORT_DIR, filename);
    const richHtml = resolveRichDocumentHtml(doc.properties);
    if (exportJob.format === "pdf") {
      if (!richHtml) {
        throw new Error(
          "PDF export requires rich HTML snapshot. Document currently has plaintext only.",
        );
      }

      const htmlPath = path.join(EXPORT_DIR, `${exportJob.id}.html`);
      await fs.writeFile(htmlPath, richHtml, "utf8");
      try {
        await runLibreOfficeToPdf(htmlPath, EXPORT_DIR);
        const generatedPdfPath = path.join(EXPORT_DIR, `${exportJob.id}.pdf`);
        const pdf = await fs.readFile(generatedPdfPath);
        await fs.writeFile(filePath, pdf);
      } catch {
        throw new Error(
          "LibreOffice PDF conversion is unavailable. Configure soffice in worker runtime.",
        );
      } finally {
        await fs.rm(htmlPath, { force: true }).catch(() => undefined);
      }
    } else {
      const markdownSource = richHtml ?? `<h1>${doc.title}</h1><p>${doc.contentPlaintext}</p>`;
      await fs.writeFile(filePath, toMarkdown(markdownSource), "utf8");
    }
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
