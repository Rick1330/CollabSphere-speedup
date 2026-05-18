/**
 * Auth session store.
 *
 * Source of truth for "who is signed in right now", backed by auth API data.
 */

import { useSyncExternalStore } from "react";

import type { WorkspaceRoleKey, WorkspaceType } from "@/lib/persona-scenario";

const STORAGE_KEY = "cs-auth-session";
const CSRF_COOKIE_NAME = "csrf_token";

/** Read double-submit CSRF cookie (visible on same origin, e.g. Vite proxy). */
export function readCsrfTokenFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${CSRF_COOKIE_NAME}=`)) {
      const value = decodeURIComponent(part.slice(CSRF_COOKIE_NAME.length + 1));
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

/** Merge `csrf_token` cookie into the in-memory session when localStorage omitted it (stale sessions). */
export function hydrateCsrfTokenFromCookie(): void {
  if (!current?.accessToken || current.csrfToken) return;
  const fromCookie = readCsrfTokenFromDocumentCookie();
  if (!fromCookie) return;
  current = { ...current, csrfToken: fromCookie };
  writeSession(current);
}

export interface SessionAccount {
  id: string;
  email: string;
  password: string;
  fullName: string;
  initials: string;
  bio: string | null;
  avatarUrl: string | null;
  globalRole: "USER" | "ADMIN";
  authProvider: "local" | "google";
  status: "active";
  defaultWorkspaceId: string;
  defaultWorkspaceType: WorkspaceType;
  defaultWorkspaceRole: WorkspaceRoleKey;
  blurb: string;
}

export interface AuthSession {
  accountId: string;
  accessToken: string;
  /** Mirrors `csrf_token` cookie on the API origin; required for mutating requests when CSRF guard is enabled. */
  csrfToken?: string;
  /** First workspace UUID from API after login; avoids legacy `/w/thesis` slugs in deep links. */
  defaultWorkspaceId?: string;
  issuedAt: string; // ISO
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    globalRole?: "USER" | "ADMIN";
    /** `local` = email/password, `google` = OAuth (matches API Prisma enum). */
    authProvider?: "local" | "google";
    defaultWorkspaceRole?: WorkspaceRoleKey;
    defaultWorkspaceType?: WorkspaceType;
  };
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accountId || !parsed?.accessToken) return null;
    if (!parsed.csrfToken) {
      const fromCookie = readCsrfTokenFromDocumentCookie();
      if (fromCookie) parsed.csrfToken = fromCookie;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(s: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

let current: AuthSession | null = readSession();
hydrateCsrfTokenFromCookie();
/** Suppresses `onAuthFailure` while `/login#oauth=` is being applied (avoids double sign-in). */
let oauthBootstrapping = false;
const listeners = new Set<() => void>();

export function isOAuthHashPresent(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#oauth=");
}

export function isAuthFailureSuppressed(): boolean {
  return oauthBootstrapping || isOAuthHashPresent();
}

/** Remove `#oauth=...` from the URL without navigation (safe on sign-out and after OAuth bootstrap). */
export function clearOAuthHashFromUrl(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash.startsWith("#oauth=")) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function buildResolvedAccountSnapshot(): SessionAccount | null {
  if (!current || !current.user) return null;

  const initials = current.user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  return {
    id: current.user.id,
    email: current.user.email,
    password: "",
    fullName: current.user.fullName,
    initials,
    bio: null,
    avatarUrl: current.user.avatarUrl ?? null,
    globalRole: current.user.globalRole ?? "USER",
    authProvider: current.user.authProvider === "google" ? "google" : "local",
    status: "active",
    defaultWorkspaceId: current.defaultWorkspaceId ?? "alpha",
    defaultWorkspaceType: current.user.defaultWorkspaceType ?? "general",
    defaultWorkspaceRole: current.user.defaultWorkspaceRole ?? "MEMBER",
    blurb: "API-authenticated user",
  };
}

/** Cached between session updates so useSyncExternalStore snapshots stay referentially stable. */
let resolvedAccountSnapshot: SessionAccount | null = buildResolvedAccountSnapshot();

function emit() {
  resolvedAccountSnapshot = buildResolvedAccountSnapshot();
  for (const l of listeners) l();
}

export const authSession = {
  get(): AuthSession | null {
    return current;
  },
  getCsrfToken(): string | null {
    hydrateCsrfTokenFromCookie();
    const t = current?.csrfToken;
    return typeof t === "string" && t.length > 0 ? t : null;
  },
  getAccessToken(): string | null {
    return current?.accessToken ?? null;
  },
  setOAuthBootstrapping(value: boolean) {
    oauthBootstrapping = value;
  },
  isOAuthBootstrapping(): boolean {
    return oauthBootstrapping;
  },
  getAccount(): SessionAccount | null {
    return resolvedAccountSnapshot;
  },
  signIn(
    accountId: string,
    options?: {
      accessToken?: string;
      csrfToken?: string;
      defaultWorkspaceId?: string;
      user?: AuthSession["user"];
    },
  ) {
    current = {
      accountId,
      accessToken: options?.accessToken ?? `mock-token-${accountId}-${Date.now()}`,
      csrfToken: options?.csrfToken,
      defaultWorkspaceId: options?.defaultWorkspaceId,
      issuedAt: new Date().toISOString(),
      user: options?.user,
    };
    writeSession(current);
    emit();
  },
  signOut() {
    oauthBootstrapping = false;
    clearOAuthHashFromUrl();
    current = null;
    writeSession(null);
    emit();
  },
  /** Merge fields into the current session (tokens after `/auth/refresh`, workspace id, etc.). */
  patchSession(
    partial: Partial<Pick<AuthSession, "defaultWorkspaceId" | "csrfToken" | "accessToken">> & {
      user?: Partial<NonNullable<AuthSession["user"]>>;
    },
  ) {
    if (!current) return;
    const { user: userPartial, ...rest } = partial;
    current = {
      ...current,
      ...rest,
      ...(userPartial && current.user
        ? { user: { ...current.user, ...userPartial } }
        : {}),
    };
    writeSession(current);
    emit();
  },
  /** Re-persist current session and notify subscribers (e.g. after external profile overlay writes). */
  touch() {
    if (!current) return;
    writeSession(current);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(
    authSession.subscribe,
    () => current,
    () => null,
  );
}

export function useCurrentAccount(): SessionAccount | null {
  return useSyncExternalStore(
    authSession.subscribe,
    () => authSession.getAccount(),
    () => null,
  );
}

export function useIsAuthenticated(): boolean {
  return useAuthSession() !== null;
}
