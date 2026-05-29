import { toast } from "sonner";
import type { ExportPageSetup } from "@collabsphere/shared/jobs";
import {
  createDocumentExport,
  pollExportJobUntilDone,
  resolveExportDownloadUrl,
} from "@/api/adapters/document-export";

export async function exportDocumentPdf(options: {
  workspaceId: string;
  documentId: string;
  documentTitle?: string;
  pageSetup?: ExportPageSetup;
}): Promise<void> {
  const { workspaceId, documentId, documentTitle, pageSetup } = options;
  const toastId = toast.loading("Generating PDF…");

  try {
    const queued = await createDocumentExport(workspaceId, documentId, "pdf", pageSetup);
    const completed = await pollExportJobUntilDone(queued.id);
    const url = resolveExportDownloadUrl(completed.downloadUrl);
    if (!url) {
      throw new Error("Export completed but download URL is missing");
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(documentTitle ?? "document").replace(/[^\w.-]+/g, "_")}.pdf`;
    anchor.rel = "noopener";
    anchor.click();

    toast.success("PDF export ready", { id: toastId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF export failed";
    toast.error(message, { id: toastId });
    throw error;
  }
}
