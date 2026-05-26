import mammoth from "mammoth";
import type { JSONContent } from "@tiptap/core";
import type { PageSetup } from "@/components/editor/canvas/pageSetup";
import { postProcessImportHtml } from "./docx-html-postprocess";
import { htmlToTipTapWithCorrections } from "./docx-html-to-tiptap";
import {
  fetchDocxFromServer,
  shouldUseServerImport,
  type DocxImportProgressCallback,
} from "./docx-import-server";
import { countDataUriImagesInContent } from "@collabsphere/docx-import";
import { parseDocumentStructure } from "./docx-ooxml";
import type { ImportWarning } from "./docx-types";

export type { ImportWarning } from "./docx-types";

export type DocxImportResult = {
  content: JSONContent;
  pageSetup: PageSetup;
  warnings: ImportWarning[];
  mode: "server" | "client";
};

export type DocxImportContext = {
  workspaceId?: string;
  documentId?: string;
  signal?: AbortSignal;
  onProgress?: DocxImportProgressCallback;
};

async function importDocxClientV2(buffer: ArrayBuffer): Promise<DocxImportResult> {
  const structure = await parseDocumentStructure(buffer);

  const mammothResult = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      styleMap: structure.mammothStyleMap,
      includeDefaultStyleMap: true,
    },
  );

  const mammothWarnings: ImportWarning[] = mammothResult.messages.map((m) => ({
    type: "warning" as const,
    message: m.message,
  }));

  const html = postProcessImportHtml(mammothResult.value, structure);
  let content = htmlToTipTapWithCorrections(html, structure);

  if (!content.content?.length) {
    mammothWarnings.push({
      type: "warning",
      message: "Document body was empty after conversion.",
    });
  }

  const dataUriStats = countDataUriImagesInContent(content);
  if (dataUriStats.imageCount > 0) {
    const message = `Import contains ${dataUriStats.imageCount} embedded base64 image(s); use server import with LibreOffice to avoid a bloated document.`;
    if (import.meta.env.DEV) {
      throw new Error(message);
    }
    mammothWarnings.push({ type: "warning", message });
  }

  return {
    content,
    pageSetup: structure.pageSetup,
    warnings: [...structure.warnings, ...mammothWarnings],
    mode: "client",
  };
}

async function importDocxViaServer(
  file: File,
  context: DocxImportContext,
): Promise<DocxImportResult> {
  const { workspaceId, documentId, signal, onProgress } = context;
  if (!workspaceId || !documentId) {
    throw new Error("Server DOCX import requires workspace and document IDs");
  }

  const server = await fetchDocxFromServer(file, workspaceId, documentId, {
    signal,
    onProgress,
  });

  return {
    content: server.content,
    pageSetup: server.pageSetup,
    warnings: server.warnings,
    mode: "server",
  };
}

const CLIENT_FALLBACK_MAX_BYTES = 2 * 1024 * 1024;

/** User-facing message for server import failures (auth vs worker/infra). */
export function formatDocxServerImportError(message: string): string {
  if (
    message.includes("(401)") ||
    message.includes("UNAUTHORIZED") ||
    message.includes("Authentication required") ||
    message.includes("TOKEN_INVALID") ||
    message.includes("TOKEN_EXPIRED")
  ) {
    return "Session expired — sign in again and retry the import.";
  }

  if (message.includes("ENOENT")) {
    const pathDetail = message.includes("DOCX not found at")
      ? ` Worker detail: ${message.slice(0, 280)}`
      : "";
    return (
      "DOCX import could not find the uploaded file on disk." +
      pathDetail +
      " Fix: DEV_WORKER_DOCKER=0 in .env, `docker rm -f collabsphere-worker`, restart `pnpm dev`, " +
      "confirm API log shows DOCX enqueued under D:\\collabsphere-data\\docx-imports, " +
      "and worker log shows the same tmpDir. Run: pnpm exec tsx scripts/diagnose-docx-import.mts"
    );
  }

  if (import.meta.env.DEV && (message.includes("(5") || message.includes("ECONNREFUSED"))) {
    return (
      `${message} Ensure pnpm dev is running with a worker (host worker when DEV_WORKER_DOCKER=0, ` +
      "or Docker worker when DEV_WORKER_DOCKER=1)."
    );
  }

  return message;
}

function clientFallbackAllowed(file: File, context: DocxImportContext): boolean {
  if (import.meta.env.VITE_DOCX_CLIENT_FALLBACK !== "true") return false;
  if (context.workspaceId && context.documentId) return false;
  return file.size <= CLIENT_FALLBACK_MAX_BYTES;
}

export async function importDocxFile(
  file: File,
  context: DocxImportContext = {},
): Promise<DocxImportResult> {
  if (shouldUseServerImport(context)) {
    try {
      return await importDocxViaServer(file, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (clientFallbackAllowed(file, context)) {
        console.warn("[docx-import] Server import failed, using opt-in client fallback", error);
      } else {
        throw new Error(formatDocxServerImportError(message));
      }
    }
  }

  const buffer = await file.arrayBuffer();
  return importDocxClientV2(buffer);
}
