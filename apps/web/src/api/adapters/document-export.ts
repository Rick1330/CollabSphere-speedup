import { request, resolveConfiguredApiBaseUrl } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";
import type { ExportPageSetup } from "@collabsphere/shared/jobs";

export type ExportJobStatus =
  | "queued"
  | "active"
  | "processing"
  | "completed"
  | "failed";

export type ExportJobRecord = {
  id: string;
  status: ExportJobStatus;
  format: string;
  downloadUrl: string | null;
  errorMessage?: string | null;
};

type ExportJobEnvelope = { exportJob: ExportJobRecord };

function parseExportJob(payload: unknown): ExportJobRecord {
  const resource = parseApiSingleEnvelope<ExportJobEnvelope>(payload);
  return resource.exportJob;
}

export async function createDocumentExport(
  workspaceId: string,
  documentId: string,
  format: "pdf" | "markdown" = "pdf",
  pageSetup?: ExportPageSetup,
): Promise<ExportJobRecord> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/exports`, {
    method: "POST",
    body: { resourceId: documentId, format, pageSetup },
  });
  return parseExportJob(payload);
}

export async function getExportJob(exportJobId: string): Promise<ExportJobRecord> {
  const payload = await request<unknown>(`/exports/${exportJobId}`);
  return parseExportJob(payload);
}

export async function pollExportJobUntilDone(
  exportJobId: string,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<ExportJobRecord> {
  const intervalMs = options?.intervalMs ?? 1500;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const job = await getExportJob(exportJobId);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.errorMessage ?? "PDF export failed");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("PDF export timed out");
}

export function resolveExportDownloadUrl(downloadUrl: string | null): string | null {
  if (!downloadUrl) return null;
  if (downloadUrl.startsWith("http")) return downloadUrl;
  const base = resolveConfiguredApiBaseUrl().replace(/\/$/, "");
  const path = downloadUrl.startsWith("/") ? downloadUrl : `/${downloadUrl}`;
  return `${base}${path}`;
}
