import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { tryRefreshSession } from "@/api/client";
import { fetchCurrentUser, applyUserProfileToSession } from "@/api/adapters/settings";
import {
  authSession,
  hydrateCsrfTokenFromCookie,
  isAuthFailureSuppressed,
  useAuthSession,
} from "@/lib/auth-session";
import { teardownAuthSession } from "@/lib/auth-teardown";

export type AuthBootstrapStatus = "pending" | "ready" | "failed";

type AuthBootstrapContextValue = {
  status: AuthBootstrapStatus;
  isSessionReady: boolean;
};

const AuthBootstrapContext = createContext<AuthBootstrapContextValue>({
  status: "pending",
  isSessionReady: false,
});

export function useAuthBootstrap(): AuthBootstrapContextValue {
  return useContext(AuthBootstrapContext);
}

function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export function AuthBootstrapProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  const navigate = useNavigate();
  const session = useAuthSession();
  const [status, setStatus] = useState<AuthBootstrapStatus>(() =>
    session?.accessToken ? "pending" : "ready",
  );

  useEffect(() => {
    if (!session?.accessToken) {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("pending");

    void (async () => {
      try {
        hydrateCsrfTokenFromCookie();
        const csrf = authSession.getCsrfToken();
        if (csrf || session.accessToken) {
          await tryRefreshSession();
        }

        if (!authSession.getAccessToken()) {
          if (!cancelled) setStatus("failed");
          return;
        }

        const profile = await fetchCurrentUser();
        if (cancelled) return;
        applyUserProfileToSession(profile);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (status !== "failed" || isAuthFailureSuppressed()) return;

    void (async () => {
      await teardownAuthSession(queryClient, { callApiLogout: true });
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      if (isPublicAuthPath(path)) return;
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      void navigate(`/login?next=${next}`, { replace: true });
    })();
  }, [status, navigate, queryClient]);

  useEffect(() => {
    if (status !== "ready" || !session?.accessToken) return;
    void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    void queryClient.invalidateQueries({ queryKey: ["current-user"] });
  }, [status, session?.accessToken, queryClient]);

  const value = useMemo(
    (): AuthBootstrapContextValue => ({
      status,
      isSessionReady: status === "ready",
    }),
    [status],
  );

  return (
    <AuthBootstrapContext.Provider value={value}>{children}</AuthBootstrapContext.Provider>
  );
}
