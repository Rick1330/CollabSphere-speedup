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
    if (error.status === 401) {
      hint = "Sign out and sign in again — your session may have expired.";
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
      hint: "Is the API running on port 3001? If you use IPv6 (::1), reload after updating the app.",
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong while loading data." };
}
