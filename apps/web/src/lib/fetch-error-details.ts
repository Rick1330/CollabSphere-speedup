import { ApiError } from "@/api/client";
import { DEV_CORS_TROUBLESHOOTING } from "@/lib/dev-auth-troubleshooting";

function devNetworkFetchHint(): string {
  const parts: string[] = [];
  if (typeof window !== "undefined" && window.location.origin === "http://127.0.0.1:8080") {
    parts.push(
      "If DevTools → Network shows a failed OPTIONS with no Access-Control-Allow-Origin, the API on port 3001 did not answer preflight correctly — check API logs for `[api] CORS_ORIGINS`, restart `pnpm dev` after .env changes, and run `pnpm verify:cors`.",
    );
    parts.push(
      "Alternatively set `VITE_USE_DEV_PROXY=true` in `.env` and restart Vite so the browser uses same-origin `/api/v1` (no cross-origin CORS).",
    );
  } else {
    parts.push(DEV_CORS_TROUBLESHOOTING);
    parts.push(
      "In dev the UI calls the API on port 3001 by default. Confirm `pnpm dev` is running the API and try `curl http://127.0.0.1:3001/api/v1/health`.",
    );
  }
  return parts.join(" ");
}

/**
 * Human-readable details for failed adapter/client requests (React Query, etc.).
 */
export function getFetchErrorDetails(error: unknown): {
  message: string;
  requestId?: string;
  hint?: string;
} {
  if (error instanceof ApiError) {
    let requestId: string | undefined;
    const body = error.body;
    if (body && typeof body === "object") {
      const b = body as { error?: { requestId?: string }; meta?: { requestId?: string } };
      requestId = b.error?.requestId ?? b.meta?.requestId;
    }
    let hint: string | undefined;
    if (error.status === 401 || error.code === "TOKEN_INVALID" || error.code === "TOKEN_EXPIRED") {
      hint =
        "Sign out and sign in again — your session may have expired, or the API secret changed (JWT_ACCESS_SECRET).";
    } else if (error.status === 403) {
      hint = "You may not have permission for this action.";
    } else if (error.status === 404) {
      const raw = error.body;
      const flatNotFound =
        raw &&
        typeof raw === "object" &&
        "code" in raw &&
        (raw as { code?: string }).code === "NOT_FOUND" &&
        !("error" in raw);
      if (flatNotFound) {
        hint =
          "Port 3001 may be serving the collab service instead of the Nest API. Stop all pnpm dev processes, confirm COLLAB_PORT=3002 in .env, restart pnpm dev, and curl http://127.0.0.1:3001/api/v1/health (expect JSON with data.status, not {\"code\":\"NOT_FOUND\"}).";
      }
    } else if (error.status === 0) {
      hint = "Request timed out or was cancelled.";
    }
    return { message: error.message, requestId, hint };
  }

  if (error instanceof TypeError && /fetch|Failed to fetch|NetworkError/i.test(error.message)) {
    return {
      message: error.message,
      hint: import.meta.env.DEV
        ? devNetworkFetchHint()
        : "Check your network connection and that the API is reachable.",
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong while loading data." };
}
