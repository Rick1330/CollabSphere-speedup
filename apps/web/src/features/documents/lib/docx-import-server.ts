import type { JSONContent } from "@tiptap/core";
import type { PageSetup } from "@/components/editor/canvas/pageSetup";
import { fetchAuthenticated, resolveConfiguredApiBaseUrl } from "@/api/client";
import type { ImportWarning } from "./docx-types";

export type DocxImportProgressCallback = (progress: number) => void;

export function shouldUseServerImport(context: {
  workspaceId?: string;
  documentId?: string;
}): boolean {
  if (import.meta.env.VITE_DOCX_SERVER_IMPORT === "false") return false;
  return Boolean(context.workspaceId && context.documentId);
}

export type ServerDocxImportResult = {
  content: JSONContent;
  pageSetup: PageSetup;
  warnings: ImportWarning[];
  metadata?: {
    pageCount: number;
    wordCount: number;
    characterCount: number;
    hasImages: boolean;
    hasTables: boolean;
  };
};

type ImportJobState = "queued" | "waiting" | "active" | "delayed" | "completed" | "failed";

type ImportJobStatusPayload = {
  importJobId: string;
  status: ImportJobState;
  progress?: number;
  result?: ServerDocxImportResult;
  errorMessage?: string;
};

function apiBase(): string {
  return resolveConfiguredApiBaseUrl();
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function readErrorText(res: Response): Promise<string> {
  return res.text().catch(() => "");
}

export async function fetchDocxFromServer(
  file: File,
  workspaceId: string,
  documentId: string,
  options?: { signal?: AbortSignal; onProgress?: DocxImportProgressCallback },
): Promise<ServerDocxImportResult> {
  const { signal, onProgress } = options ?? {};
  const base = apiBase();
  const form = new FormData();
  form.append("file", file);

  const url = `${base}/workspaces/${workspaceId}/documents/${documentId}/import/docx`;
  const res = await fetchAuthenticated(url, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`Server DOCX import failed (${res.status}): ${text}`);
  }

  const body = (await res.json()) as {
    data?: {
      resource?: { importJobId?: string };
      importJobId?: string;
    };
  };

  const resource = body.data?.resource ?? body.data;
  const importJobId = resource?.importJobId;
  if (!importJobId) {
    throw new Error("Server DOCX import did not return import job id");
  }

  onProgress?.(0);

  const statusUrl = `${base}/workspaces/${workspaceId}/documents/${documentId}/import/docx/${importJobId}`;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    await delay(1000, signal);
    const statusRes = await fetchAuthenticated(statusUrl, {
      method: "GET",
      signal,
    });
    if (!statusRes.ok) {
      const text = await readErrorText(statusRes);
      throw new Error(`Server DOCX import status failed (${statusRes.status}): ${text}`);
    }

    const statusBody = (await statusRes.json()) as {
      data?: { resource?: { importJob?: ImportJobStatusPayload } };
    };
    const importJob = statusBody.data?.resource?.importJob;
    if (!importJob) {
      throw new Error("Server DOCX import status payload missing import job");
    }

    if (typeof importJob.progress === "number") {
      onProgress?.(importJob.progress);
    }

    if (importJob.status === "failed") {
      throw new Error(importJob.errorMessage ?? "Server DOCX import failed");
    }

    if (importJob.status === "completed" && importJob.result?.content) {
      onProgress?.(100);
      return importJob.result;
    }
  }

  throw new Error("Server DOCX import timed out while waiting for worker");
}
