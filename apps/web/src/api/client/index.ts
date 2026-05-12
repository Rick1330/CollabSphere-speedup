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

/** Must match Nest `setGlobalPrefix("api/v1")` (`apps/api/src/main.ts`). */
let baseUrl = "/api/v1";
let getAuthToken: AuthTokenProvider | null = null;

export function configureApiClient(opts: {
  baseUrl?: string;
  getAuthToken?: AuthTokenProvider;
}) {
  if (opts.baseUrl !== undefined) baseUrl = opts.baseUrl;
  if (opts.getAuthToken !== undefined) getAuthToken = opts.getAuthToken;
}

/**
 * `location.hostname` for IPv6 loopback is `::1` (no brackets). The string
 * `http://::1:3001` is not a valid URL — `fetch` fails for every API call.
 * Normalize to IPv4 loopback so the dev API base resolves correctly.
 */
function hostnameForDevApi(hostname: string): string {
  if (hostname === "::1") return "127.0.0.1";
  return hostname;
}

/**
 * In dev inside the browser, point at Nest on `:3001` directly. The Vite `/api/v1`
 * proxy can hang or wedge on some Windows setups (dual-stack / stuck sockets),
 * leaving login spinners indefinite.
 */
export function getBrowserDevApiBaseUrl(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const host = hostnameForDevApi(window.location.hostname);
  return `http://${host}:3001/api/v1`;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function mergeSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  // DOM `AbortSignal.any` exists in evergreen browsers bundled by Vite.
  return AbortSignal.any([a, b]);
}

const REQUEST_DEADLINE_MS = 45_000;

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

  const deadline =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(REQUEST_DEADLINE_MS)
      : undefined;
  const mergedSignal =
    deadline === undefined ? opts.signal : mergeSignals(opts.signal, deadline);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: mergedSignal,
      credentials: "include",
    });
  } catch (err: unknown) {
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError");
    if (aborted)
      throw new ApiError(
        0,
        `${opts.method ?? "GET"} ${path}: request timed out or was cancelled`,
      );
    throw err;
  }

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
