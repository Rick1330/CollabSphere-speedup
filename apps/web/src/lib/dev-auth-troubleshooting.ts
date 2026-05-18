/**
 * Dev-only troubleshooting copy for auth/CORS/network failures.
 * See also root `.env.example` (CORS_ORIGINS, WEB_APP_URL).
 */

import { resolveConfiguredApiBaseUrl } from "@/api/client";
import { authSession } from "@/lib/auth-session";

export const DEV_API_DOWN_MESSAGE =
  "The API on port 3001 is not reachable. Stop all pnpm dev terminals, free ports 3001 and 8080 (taskkill on Windows), then run a single pnpm dev --skip-compose and wait for [dev] API is healthy.";

/** Health probe using the same API base URL as the configured REST client. */
export async function checkDevApiReachable(): Promise<boolean> {
  if (!import.meta.env.DEV) {
    return true;
  }
  const base = resolveConfiguredApiBaseUrl().replace(/\/+$/, "");
  const healthUrl = `${base}/health`;
  try {
    const res = await fetch(healthUrl, { method: "GET", credentials: "omit" });
    if (!res.ok) {
      return false;
    }
    const body = (await res.json()) as {
      data?: { resource?: { status?: string; service?: string } };
    };
    return (
      body?.data?.resource?.status === "healthy" &&
      body?.data?.resource?.service === "api"
    );
  } catch {
    return false;
  }
}

const OAUTH_QUERY_ERROR_MESSAGES: Record<string, string> = {
  OAUTH_STATE_MISMATCH: "Google sign-in expired or was interrupted. Try again.",
  OAUTH_INVALID_CALLBACK: "Google sign-in failed. Check that the API is running on port 3001.",
  ACCOUNT_DEACTIVATED: "This account has been deactivated.",
  ACCOUNT_EXISTS_LOCAL:
    "An account with this email already exists. Sign in with email and password instead.",
  SERVICE_UNAVAILABLE: "Google sign-in is not configured on the server.",
};

export function messageForOAuthQueryError(code: string | null): string | null {
  if (!code?.trim()) {
    return null;
  }
  return OAUTH_QUERY_ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Try again.`;
}

export const DEV_CORS_TROUBLESHOOTING = [
  "Open DevTools → Network and find a failed API call to :3001.",
  "If the request shows (failed) or a CORS error, check that the page Origin matches CORS_ORIGINS.",
  "Use http://127.0.0.1:8080 (canonical) — localhost:8080 redirects in Vite but CORS must list both if you use either.",
  "Compare window.location.origin with CORS_ORIGINS in .env; restart pnpm dev after .env edits.",
  "curl http://127.0.0.1:3001/api/v1/health — if OK in terminal but browser fails, it is CORS/origin not API down.",
  "On /login, remove stale #oauth= from the URL after sign-out; clear localStorage key cs-auth-session if stuck.",
].join(" ");

export function logDevSessionContext(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  console.info("[dev] session context", {
    spaOrigin: window.location.origin,
    apiBaseUrl: resolveConfiguredApiBaseUrl(),
    hasAccessToken: Boolean(authSession.getAccessToken()),
    hasCsrfToken: Boolean(authSession.getCsrfToken()),
  });
}
