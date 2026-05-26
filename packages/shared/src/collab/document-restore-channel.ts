/** Redis pub/sub channel: API publishes after restore; collab reloads in-memory room. */
export const DOCUMENT_RESTORED_CHANNEL = "collab:document:restored";

export type DocumentRestoredMessage = {
  documentId: string;
};

export function parseDocumentRestoredMessage(raw: string): DocumentRestoredMessage | null {
  try {
    const parsed = JSON.parse(raw) as { documentId?: unknown };
    if (typeof parsed.documentId === "string" && parsed.documentId.length > 0) {
      return { documentId: parsed.documentId };
    }
    return null;
  } catch {
    return null;
  }
}
