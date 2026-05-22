/**
 * Default Hocuspocus WebSocket URL for local dev.
 * Override with VITE_COLLAB_WS_URL (must be absolute ws:// or wss:// — never a relative path).
 */
/** Hocuspocus v4 listens on the TCP port root; do not append SPA-style path segments. */
export const DEFAULT_COLLAB_WS_URL = "ws://127.0.0.1:3002";

/** App route: /w/:workspaceId/documents/:documentId — never use this as the collab WebSocket URL. */
const SPA_DOCUMENT_PATH =
  /^\/w\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/documents\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i;

export function collabUrlLooksLikeSpaDocumentRoute(url: string): boolean {
  try {
    const u = new URL(url);
    return SPA_DOCUMENT_PATH.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * Returns a usable WebSocket URL, falling back to the local Hocuspocus URL when missing or invalid
 * (e.g. relative paths like "/w/.../documents/..." resolve to the SPA host and must be rejected).
 *
 * Also rejects absolute ws(s) URLs that copy the SPA document path (e.g.
 * ws://127.0.0.1:8080/w/<uuid>/documents/<uuid>) — a common misconfiguration.
 */
export function normalizeCollabWsUrl(raw: string | null | undefined): string | null {
  if (!raw) return DEFAULT_COLLAB_WS_URL;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_COLLAB_WS_URL;

  let candidate: string | null = null;
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) candidate = trimmed;
  else if (trimmed.startsWith("https://")) candidate = `wss://${trimmed.slice("https://".length)}`;
  else if (trimmed.startsWith("http://")) candidate = `ws://${trimmed.slice("http://".length)}`;
  else if (trimmed.startsWith("/")) {
    if (import.meta.env.DEV) {
      console.warn("[collab] VITE_COLLAB_WS_URL is relative; using the default collab server URL.");
    }
    return DEFAULT_COLLAB_WS_URL;
  } else return DEFAULT_COLLAB_WS_URL;

  if (candidate && collabUrlLooksLikeSpaDocumentRoute(candidate)) {
    if (import.meta.env.DEV) {
      console.warn(
        "[collab] Ignoring collab WebSocket URL: it matches the SPA document route (/w/.../documents/...), not the Hocuspocus server. Set VITE_COLLAB_WS_URL to your collab host (e.g. ws://127.0.0.1:3002).",
        candidate,
      );
    }
    return DEFAULT_COLLAB_WS_URL;
  }

  return candidate;
}

/** Resolved collab URL from env with safe fallback (never relative). */
export function resolveCollabWsUrlFromEnv(): string {
  return normalizeCollabWsUrl(import.meta.env.VITE_COLLAB_WS_URL) ?? DEFAULT_COLLAB_WS_URL;
}
