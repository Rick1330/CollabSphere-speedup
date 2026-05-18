/**
 * App-level providers.
 *
 * Wraps the application with React Query, tooltip, toast providers, and
 * mounts the global theme listener so the resolved theme tracks the user's
 * system preference live (when their preference is "system") and applies
 * any manual override they've chosen on every page — not just settings.
 *
 * Must render inside `BrowserRouter` so the API client can register a
 * session-expiry handler that uses `useNavigate`.
 */
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { configureApiClient, resolveConfiguredApiBaseUrl } from "@/api/client";
import { applyUserProfileToSession, fetchCurrentUser } from "@/api/adapters/settings";
import { authSession, isAuthFailureSuppressed, useAuthSession } from "@/lib/auth-session";
import { teardownAuthSession } from "@/lib/auth-teardown";
import { logDevSessionContext } from "@/lib/dev-auth-troubleshooting";

/** Mount-only component so the theme hook runs once at the root. */
function ThemeListener() {
  useThemePreference();
  return null;
}

function ApiClientAuthBridge({ queryClient }: { queryClient: QueryClient }) {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    // Dev note: if OAuth "works on second try", align the web app URL host with the API
    // (e.g. both `127.0.0.1` or both `localhost`) so refresh/session cookies stay on one origin.
    logDevSessionContext();
    configureApiClient({
      baseUrl: resolveConfiguredApiBaseUrl(),
      getAuthToken: () => authSession.getAccessToken(),
      onAccessTokenRefreshed: () => {
        void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      },
      onAuthFailure: () => {
        if (isAuthFailureSuppressed()) return;
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (
            path === "/login" ||
            path.startsWith("/register") ||
            path.startsWith("/forgot-password")
          ) {
            return;
          }
        }
        void (async () => {
          await teardownAuthSession(queryClient, { callApiLogout: true });
          if (typeof window === "undefined") return;
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          void navigate(`/login?next=${next}`, { replace: true });
        })();
        return;
      },
    });
  }, [navigate, queryClient]);

  return null;
}

/** Sync globalRole and profile fields from GET /users/me on boot and after token refresh. */
function SessionSyncBridge() {
  const session = useAuthSession();

  const { data } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: !!session?.accessToken,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      applyUserProfileToSession(data);
    }
  }, [data]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientAuthBridge queryClient={queryClient} />
      <SessionSyncBridge />
      <TooltipProvider>
        <ThemeListener />
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
