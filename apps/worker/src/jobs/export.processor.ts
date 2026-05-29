import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { JobTypes, Queues, type ExportJobData } from "@collabsphere/shared/jobs";
import {
  normalizeExportPageSetup,
  pageSetupToPrintOptions,
  plaintextToExportHtml,
  yjsStateToExportHtml,
} from "@collabsphere/document-export/server";

const storageRoot = path.resolve(process.env.STORAGE_LOCAL_PATH ?? "./uploads");

async function renderPdfFromHtml(
  html: string,
  marginMm: { top: number; right: number; bottom: number; left: number },
): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: `${marginMm.top}mm`,
        right: `${marginMm.right}mm`,
        bottom: `${marginMm.bottom}mm`,
        left: `${marginMm.left}mm`,
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function startExportProcessor(connection: Redis): Worker<ExportJobData> {
  const prisma = new PrismaClient();

  const worker = new Worker<ExportJobData>(
    Queues.EXPORT,
    async (job: Job<ExportJobData>) => {
      const { exportJobId, documentId, format, pageSetup: jobPageSetup } = job.data;

      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "processing" },
      });

      try {
        const doc = await prisma.document.findFirst({
          where: { id: documentId, deletedAt: null },
          select: {
            id: true,
            title: true,
            contentYjs: true,
            contentPlaintext: true,
          },
        });

        if (!doc) {
          throw new Error("Document not found for export");
        }

        const setup = normalizeExportPageSetup(jobPageSetup);
        const printOpts = pageSetupToPrintOptions(setup);
        const yjsBytes = doc.contentYjs ? new Uint8Array(doc.contentYjs) : new Uint8Array(0);
        const html =
          yjsBytes.byteLength > 0
            ? yjsStateToExportHtml(yjsBytes, doc.title, jobPageSetup)
            : plaintextToExportHtml(doc.contentPlaintext ?? "", doc.title, jobPageSetup);

        if (format === "markdown") {
          const mdPath = path.join(storageRoot, "exports", `${exportJobId}.md`);
          await fs.mkdir(path.dirname(mdPath), { recursive: true });
          await fs.writeFile(mdPath, doc.contentPlaintext ?? "", "utf8");
          await prisma.exportJob.update({
            where: { id: exportJobId },
            data: {
              status: "completed",
              outputStorageKey: `exports/${exportJobId}.md`,
              completedAt: new Date(),
            },
          });
          return;
        }

        const pdfBuffer = await renderPdfFromHtml(html, printOpts.marginMm);
        const pdfPath = path.join(storageRoot, "exports", `${exportJobId}.pdf`);
        await fs.mkdir(path.dirname(pdfPath), { recursive: true });
        await fs.writeFile(pdfPath, pdfBuffer);

        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: "completed",
            outputStorageKey: `exports/${exportJobId}.pdf`,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Export failed",
          },
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: 1,
    },
  );

  return worker;
}

export const exportJobName = JobTypes.EXPORT_PDF;
