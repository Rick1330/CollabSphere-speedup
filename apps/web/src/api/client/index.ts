/**
 * Shared HTTP client for the future backend.
 *
 * This is the single seam where real API calls will eventually be made.
 * Today the app runs on mocks (see src/api/mocks), but every adapter that
 * fronts a domain (auth, documents, tasks, …) is expected to flow through
 * this module so swapping mocks → real fetch is a one-file change per
 * domain.
 *
 * Conventions:
 *   - All requests are JSON in / JSON out.
 *   - Auth headers are injected via setAuthTokenProvider().
 *   - Throws ApiError on non-2xx responses; never swallows errors.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type AuthTokenProvider = () => string | null | Promise<string | null>;

let baseUrl = "/api";
let getAuthToken: AuthTokenProvider | null = null;

export function configureApiClient(opts: {
  baseUrl?: string;
  getAuthToken?: AuthTokenProvider;
}) {
  if (opts.baseUrl !== undefined) baseUrl = opts.baseUrl;
  if (opts.getAuthToken !== undefined) getAuthToken = opts.getAuthToken;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  };

  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: "include",
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => undefined);
  }
  let message = `${opts.method ?? "GET"} ${path} → ${res.status}`;
  let code: string | undefined;
  if (body && typeof body === "object" && "error" in body) {
    const errorObj = (body as { error?: { message?: string; code?: string } }).error;
    if (typeof errorObj?.message === "string") message = errorObj.message;
    if (typeof errorObj?.code === "string") code = errorObj.code;
  }
  throw new ApiError(res.status, message, body, code);
}
