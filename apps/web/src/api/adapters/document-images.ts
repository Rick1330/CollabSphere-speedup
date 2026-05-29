import { fetchAuthenticated, resolveConfiguredApiBaseUrl } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";

export type DocumentImageUploadResult = {
  url: string;
  filename: string;
};

export async function uploadDocumentImage(
  file: File,
  context: { workspaceId: string; documentId: string; signal?: AbortSignal },
): Promise<DocumentImageUploadResult> {
  const base = resolveConfiguredApiBaseUrl();
  const form = new FormData();
  form.append("file", file);

  const url = `${base}/workspaces/${encodeURIComponent(context.workspaceId)}/documents/${encodeURIComponent(context.documentId)}/images`;
  const res = await fetchAuthenticated(url, {
    method: "POST",
    body: form,
    signal: context.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Image upload failed (${res.status})`);
  }

  const payload = await res.json();
  return parseApiSingleEnvelope<DocumentImageUploadResult>(payload);
}
