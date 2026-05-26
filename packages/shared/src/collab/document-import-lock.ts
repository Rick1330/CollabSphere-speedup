/** Redis key: worker sets during DOCX import so collab persistence skips stale flushes. */
export const DOCUMENT_IMPORT_LOCK_PREFIX = "doc:import-lock:";

export const DOCUMENT_IMPORT_LOCK_TTL_SECONDS = 60;

export function documentImportLockKey(documentId: string): string {
  return `${DOCUMENT_IMPORT_LOCK_PREFIX}${documentId}`;
}
