/**
 * Mock auth session store.
 *
 * Source of truth for "who is signed in right now". Persisted to
 * localStorage so reloads keep the session, and exposed as a
 * `useSyncExternalStore` hook so React components react instantly to
 * sign-in / sign-out / profile-update events.
 *
 * The session is intentionally minimal: an account id + a fake token +
 * an issued-at timestamp. Profile data is looked up from `mock-accounts`
 * when needed so a single source of truth stays canonical.
 */

import { useSyncExternalStore } from "react";
import { findAccountById, type MockAccount } from "@/lib/mock-accounts";

const STORAGE_KEY = "cs-auth-session";

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

function emit() {
  for (const l of listeners) l();
}

export const authSession = {
  get(): AuthSession | null {
    return current;
  },
  getAccessToken(): string | null {
    return current?.accessToken ?? null;
  },
  getAccount(): MockAccount | null {
    if (!current) return null;
    const account = findAccountById(current.accountId);
    if (account) return account;
    if (!current.user) return null;
    return {
      id: current.user.id,
      email: current.user.email,
      password: "",
      fullName: current.user.fullName,
      initials: current.user.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0]?.toUpperCase() ?? "")
        .join(""),
      bio: null,
      avatarUrl: current.user.avatarUrl ?? null,
      globalRole: current.user.globalRole ?? "USER",
      authProvider: "local",
      status: "active",
      defaultWorkspaceId: "alpha",
      defaultWorkspaceType: "general",
      defaultWorkspaceRole: "MEMBER",
      blurb: "Authenticated user",
    };
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

export function useCurrentAccount(): MockAccount | null {
  const session = useAuthSession();
  if (!session) return null;
  return findAccountById(session.accountId) ?? null;
}

export function useIsAuthenticated(): boolean {
  return useAuthSession() !== null;
}
