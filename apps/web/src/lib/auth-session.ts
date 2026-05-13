/**
 * Auth session store.
 *
 * Source of truth for "who is signed in right now", backed by auth API data.
 */

import { useSyncExternalStore } from "react";

import type { WorkspaceRoleKey, WorkspaceType } from "@/lib/persona-scenario";

const STORAGE_KEY = "cs-auth-session";

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
  issuedAt: string; // ISO
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    globalRole?: "USER" | "ADMIN";
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
const listeners = new Set<() => void>();

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
    authProvider: "local",
    status: "active",
    defaultWorkspaceId: "alpha",
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
  getAccessToken(): string | null {
    return current?.accessToken ?? null;
  },
  getAccount(): SessionAccount | null {
    return resolvedAccountSnapshot;
  },
  signIn(accountId: string, options?: { accessToken?: string; user?: AuthSession["user"] }) {
    current = {
      accountId,
      accessToken: options?.accessToken ?? `mock-token-${accountId}-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      user: options?.user,
    };
    writeSession(current);
    emit();
  },
  signOut() {
    current = null;
    writeSession(null);
    emit();
  },
  /** Notify subscribers when the underlying account record changes (e.g. profile update). */
  touch() {
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
