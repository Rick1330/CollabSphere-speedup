import { ApiError } from "@/api/client";

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
    } else if (error.status === 0) {
      hint = "Request timed out or was cancelled.";
    }
    return { message: error.message, requestId, hint };
  }

  if (error instanceof TypeError && /fetch|Failed to fetch|NetworkError/i.test(error.message)) {
    return {
      message: error.message,
      hint:
        "In dev the UI calls the API on port 3001 by default (Vite’s `/api/v1` proxy can hang on some Windows setups). Confirm `pnpm dev` is running the API and try `curl http://127.0.0.1:3001/api/v1/health`. Start Postgres/Redis (`docker compose up -d`) if the API exits on boot. Set `VITE_USE_DEV_PROXY=true` only if you intentionally want same-origin `/api/v1` through Vite on port 8080.",
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong while loading data." };
}
