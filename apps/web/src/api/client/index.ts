/**
 * Shared HTTP client for the Nest API (`/api/v1`).
 *
 * All domain adapters should use `request()` so auth headers, CSRF, refresh-on-401,
 * and error handling stay consistent.
 */

import { authSession, isAuthFailureSuppressed } from "@/lib/auth-session";
import { parseApiActionEnvelope } from "@/api/client/envelope";

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
type AuthFailureHandler = () => void;
type AccessTokenRefreshedHandler = () => void;

/** Must match Nest `setGlobalPrefix("api/v1")` (`apps/api/src/dev.ts`). */
let baseUrl = "/api/v1";
let getAuthToken: AuthTokenProvider | null = null;
let onAuthFailure: AuthFailureHandler | null = null;
let onAccessTokenRefreshed: AccessTokenRefreshedHandler | null = null;

const isAuthBootstrapApiPath = (path: string) => {
  const p = path.startsWith("http") ? (() => { try { return new URL(path).pathname; } catch { return path; } })() : path;
  return (
    p.includes("/auth/login") ||
    p.includes("/auth/register") ||
    p.includes("/auth/forgot-password") ||
    p.includes("/auth/reset-password") ||
    p.includes("/auth/verify-email") ||
    p.includes("/auth/refresh")
  );
};

const isAuthFailure = (status: number, code: string | undefined) =>
  status === 401 || code === "TOKEN_INVALID" || code === "TOKEN_EXPIRED";

export function configureApiClient(opts: {
  baseUrl?: string;
  getAuthToken?: AuthTokenProvider;
  /** Called when an authenticated request returns invalid/expired credentials (clears session + redirect). */
  onAuthFailure?: AuthFailureHandler | null;
  /** Called after `/auth/refresh` rotates the access token successfully. */
  onAccessTokenRefreshed?: AccessTokenRefreshedHandler | null;
}) {
  if (opts.baseUrl !== undefined) baseUrl = opts.baseUrl;
  if (opts.getAuthToken !== undefined) getAuthToken = opts.getAuthToken;
  if (opts.onAuthFailure !== undefined) onAuthFailure = opts.onAuthFailure;
  if (opts.onAccessTokenRefreshed !== undefined) onAccessTokenRefreshed = opts.onAccessTokenRefreshed;
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
 * In dev inside the browser, call Nest on `:3001` directly by default. Same-origin
 * `/api/v1` via the Vite proxy can hang indefinitely on some Windows setups (dual-stack
 * / stuck sockets); opt in with `VITE_USE_DEV_PROXY=true` if you prefer one origin in dev.
 */
export function getBrowserDevApiBaseUrl(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;

  const fromEnv = trimEnvString(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) {
    return normalizeDevApiAbsoluteUrl(fromEnv.replace(/\/+$/, ""));
  }

  // Fallback when root `.env` does not set VITE_API_BASE_URL (canonical local API port).
  return "http://127.0.0.1:3001/api/v1";
}

/**
 * When `VITE_API_BASE_URL` is an absolute `http(s)` URL in dev, rewrite
 * `localhost` / IPv6 loopback to `127.0.0.1` so the browser never calls
 * `http://::1:...` (invalid) and avoids Windows dual-stack issues where
 * `localhost` resolves differently than the Nest listener.
 */
export function normalizeDevApiAbsoluteUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "::1" || u.hostname === "[::1]") {
      u.hostname = "127.0.0.1";
    } else if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function trimEnvString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/** When true in dev, use same-origin `/api/v1` (Vite proxy). Default is false — direct API on :3001 avoids proxy hangs. */
function readDevProxyFlag(): boolean {
  const v = trimEnvString(import.meta.env.VITE_USE_DEV_PROXY);
  return v === "1" || v === "true" || v === "yes";
}

/** Resolved once at startup in `AppProviders`. */
export function resolveConfiguredApiBaseUrl(): string {
  const fromEnv = trimEnvString(import.meta.env.VITE_API_BASE_URL);
  const devBrowser = import.meta.env.DEV && typeof window !== "undefined";

  let candidate: string | undefined;
  if (devBrowser && readDevProxyFlag()) {
    candidate = "/api/v1";
  } else {
    candidate = fromEnv ?? (devBrowser ? getBrowserDevApiBaseUrl() : undefined) ?? "/api/v1";
  }

  if (devBrowser && /^https?:\/\//i.test(candidate)) {
    candidate = normalizeDevApiAbsoluteUrl(candidate);
  }

  const trimmed = candidate.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/api/v1";
}

/**
 * Nest API origin for full-page browser redirects (Google OAuth). Always targets the real API
 * host (e.g. :3001), not the Vite proxy path, even when `VITE_USE_DEV_PROXY=true`.
 */
export function resolveApiOriginForBrowserRedirect(): string {
  const proxyTarget = trimEnvString(import.meta.env.VITE_API_PROXY_TARGET);
  if (proxyTarget) {
    try {
      return httpUrlOrigin(normalizeDevApiAbsoluteUrl(proxyTarget));
    } catch {
      /* fall through */
    }
  }

  const apiBase = trimEnvString(import.meta.env.VITE_API_BASE_URL);
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return httpUrlOrigin(normalizeDevApiAbsoluteUrl(apiBase));
  }

  const direct = getBrowserDevApiBaseUrl();
  if (direct) {
    return httpUrlOrigin(direct);
  }

  return "http://127.0.0.1:3001";
}

/** Absolute URL to start Google OAuth (`GET /api/v1/auth/google` on the API process). */
export function resolveOAuthStartUrl(): string {
  const origin = resolveApiOriginForBrowserRedirect().replace(/\/+$/, "");
  return `${origin}/api/v1/auth/google`;
}

/**
 * Socket.IO must reach the Nest process (port 3001 in local dev). When the REST client
 * uses the Vite proxy (`VITE_USE_DEV_PROXY=true`), use same-origin `/` so `/socket.io`
 * is proxied; otherwise use the API origin matching `getBrowserDevApiBaseUrl()`.
 */
export function resolveRealtimeSocketOrigin(): string {
  const devBrowser = import.meta.env.DEV && typeof window !== "undefined";
  if (!devBrowser) {
    return "/";
  }

  const rt = trimEnvString(import.meta.env.VITE_REALTIME_BASE_URL);
  const api = trimEnvString(import.meta.env.VITE_API_BASE_URL);
  const pick = rt ?? api;
  if (pick && /^https?:\/\//i.test(pick)) {
    return httpUrlOrigin(normalizeDevApiAbsoluteUrl(pick));
  }

  if (readDevProxyFlag()) {
    return "/";
  }

  const direct = getBrowserDevApiBaseUrl();
  return direct ? httpUrlOrigin(direct) : "/";
}

/** HTTP(S) origin only (no path). Socket.IO is served from the API origin, not under `/api/v1`. */
export function httpUrlOrigin(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
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

/** Single-flight refresh so concurrent 401s share one `/auth/refresh` call. */
let refreshSessionInFlight: Promise<boolean> | null = null;
let refreshThrottledUntil = 0;

/**
 * Rotate access JWT using refresh cookie + CSRF header (same contract as Nest `POST /auth/refresh`).
 * Does not use `request()` to avoid recursion. Updates `authSession` on success.
 */
/** Rotate access JWT via refresh cookie (single-flight). Exported for app boot bootstrap. */
export function tryRefreshSession(): Promise<boolean> {
  return refreshSessionWithCookie();
}

function refreshSessionWithCookie(): Promise<boolean> {
  const now = Date.now();
  if (refreshThrottledUntil > now) {
    return Promise.resolve(false);
  }
  if (!refreshSessionInFlight) {
    refreshSessionInFlight = (async (): Promise<boolean> => {
      const csrf = authSession.getCsrfToken();
      if (!csrf) return false;
      const url = `${baseUrl}/auth/refresh`;
      try {
        const deadline =
          typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(REQUEST_DEADLINE_MS)
            : undefined;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
          },
          credentials: "include",
          signal: deadline,
        });
        if (!res.ok) {
          // Avoid hammering refresh when the API rate-limits (common during dev reload loops).
          if (res.status === 429) {
            refreshThrottledUntil = Date.now() + 10_000;
          }
          return false;
        }
        const payload = (await res.json()) as unknown;
        const { extraData } = parseApiActionEnvelope<{
          accessToken?: string;
          csrfToken?: string;
        }>(payload);
        const accessToken = extraData.accessToken;
        const nextCsrf =
          typeof extraData.csrfToken === "string" && extraData.csrfToken.length > 0
            ? extraData.csrfToken
            : csrf;
        if (typeof accessToken !== "string" || accessToken.length === 0) return false;
        authSession.patchSession({ accessToken, csrfToken: nextCsrf });
        onAccessTokenRefreshed?.();
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshSessionInFlight = null;
    });
  }
  return refreshSessionInFlight;
}

async function resolveAccessToken(): Promise<{ token: string | null; hadBearer: boolean }> {
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) return { token, hadBearer: true };
  }
  const fallback = authSession.getAccessToken();
  if (fallback) return { token: fallback, hadBearer: true };
  return { token: null, hadBearer: false };
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Build fetch init with Bearer + CSRF (for mutating methods), matching `request()`.
 * Does not set Content-Type — caller must omit it for FormData uploads.
 */
export async function buildAuthenticatedFetchInit(
  method: string,
  init: RequestInit = {},
): Promise<RequestInit> {
  const normalizedMethod = method.toUpperCase();
  const callerHeaders =
    init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : { ...(init.headers as Record<string, string> | undefined) };

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...callerHeaders,
  };

  const { token, hadBearer } = await resolveAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (MUTATING_METHODS.has(normalizedMethod)) {
    const csrf = authSession.getCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    } else if (hadBearer) {
      throw new ApiError(
        403,
        "Session is missing CSRF protection. Sign out and sign in again.",
        undefined,
        "CSRF_TOKEN_MISSING",
      );
    }
  }

  return {
    ...init,
    method: normalizedMethod,
    headers,
    credentials: init.credentials ?? "include",
  };
}

/**
 * Authenticated `fetch` with one refresh-on-401 retry (for multipart / custom bodies).
 */
export async function fetchAuthenticated(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { hadBearer } = await resolveAccessToken();
    const fetchInit = await buildAuthenticatedFetchInit(method, init);
    const res = await fetch(url, fetchInit);

    if (res.ok) return res;

    const canTryRefresh =
      attempt === 0 &&
      hadBearer &&
      res.status === 401 &&
      !isAuthBootstrapApiPath(url) &&
      !isAuthFailureSuppressed();

    if (canTryRefresh) {
      const refreshed = await refreshSessionWithCookie();
      if (refreshed) continue;
    }

    if (
      hadBearer &&
      isAuthFailure(res.status, res.status === 401 ? "UNAUTHORIZED" : undefined) &&
      !isAuthBootstrapApiPath(url) &&
      !isAuthFailureSuppressed()
    ) {
      try {
        onAuthFailure?.();
      } catch {
        /* ignore handler errors */
      }
    }

    return res;
  }

  throw new ApiError(0, `${method} ${url}: unexpected retry exhaustion`);
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const method = opts.method ?? "GET";

  const deadline =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(REQUEST_DEADLINE_MS)
      : undefined;
  const mergedSignal =
    deadline === undefined ? opts.signal : mergeSignals(opts.signal, deadline);

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...opts.headers,
    };

    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    let hadBearer = false;
    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        hadBearer = true;
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      const csrf = authSession.getCsrfToken();
      if (csrf) {
        headers["X-CSRF-Token"] = csrf;
      } else if (hadBearer) {
        throw new ApiError(
          403,
          "Session is missing CSRF protection. Sign out and sign in again.",
          undefined,
          "CSRF_TOKEN_MISSING",
        );
      }
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
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
          `${method} ${path}: request timed out or was cancelled`,
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

    const canTryRefresh =
      attempt === 0 &&
      hadBearer &&
      res.status === 401 &&
      !isAuthBootstrapApiPath(path) &&
      !isAuthFailureSuppressed();

    if (canTryRefresh) {
      const refreshed = await refreshSessionWithCookie();
      if (refreshed) continue;
    }

    if (
      hadBearer &&
      isAuthFailure(res.status, code) &&
      !isAuthBootstrapApiPath(path) &&
      !isAuthFailureSuppressed()
    ) {
      try {
        onAuthFailure?.();
      } catch {
        /* ignore handler errors */
      }
    }
    throw new ApiError(res.status, message, body, code);
  }

  throw new ApiError(0, `${method} ${path}: unexpected retry exhaustion`);
}
