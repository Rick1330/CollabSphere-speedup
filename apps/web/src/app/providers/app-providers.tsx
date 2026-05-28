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
import {
  bindAuthTokenSync,
  disconnectSocket,
  initSocket,
  syncSocketAuthFromSession,
} from "@/api/realtime/socket-client";
import { authSession, isAuthFailureSuppressed, useAuthSession } from "@/lib/auth-session";
import { teardownAuthSession } from "@/lib/auth-teardown";
import { logDevSessionContext } from "@/lib/dev-auth-troubleshooting";
import { AuthBootstrapProvider, useAuthBootstrap } from "@/lib/auth-bootstrap-context";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";

/** Mount-only component so the theme hook runs once at the root. */
function ThemeListener() {
  useThemePreference();
  return null;
}

function ApiClientAuthBridge({ queryClient }: { queryClient: QueryClient }) {
  const navigate = useNavigate();

  // Configure core client settings synchronously so queries never run against an unconfigured client.
  // (Auth failure redirect still needs `navigate`, so it's registered in the layout effect below.)
  configureApiClient({
    baseUrl: resolveConfiguredApiBaseUrl(),
    getAuthToken: () => authSession.getAccessToken(),
    onAccessTokenRefreshed: () => {
      syncSocketAuthFromSession();
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onAuthFailure: null,
  });

  useLayoutEffect(() => {
    // Dev note: if OAuth "works on second try", align the web app URL host with the API
    // (e.g. both `127.0.0.1` or both `localhost`) so refresh/session cookies stay on one origin.
    logDevSessionContext();
    configureApiClient({
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

/** Connect the singleton Socket.IO client after auth is available; tear down on sign-out. */
function RealtimeSocketBridge() {
  const session = useAuthSession();

  useEffect(() => {
    if (session?.accessToken) {
      bindAuthTokenSync();
      initSocket();
    } else {
      disconnectSocket();
    }
  }, [session?.accessToken]);

  return null;
}

/** Sync globalRole and profile fields from GET /users/me on boot and after token refresh. */
function SessionSyncBridge() {
  const session = useAuthSession();
  const { isSessionReady } = useAuthBootstrap();

  const { data } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: isSessionReady && !!session?.accessToken,
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

/** Subscribes to user-scoped notification events on every authenticated page. */
function NotificationRealtimeBridge() {
  useNotificationRealtime();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientAuthBridge queryClient={queryClient} />
      <AuthBootstrapProvider queryClient={queryClient}>
        <RealtimeSocketBridge />
        <NotificationRealtimeBridge />
        <SessionSyncBridge />
        <TooltipProvider>
        <ThemeListener />
        <Toaster />
        <Sonner />
        {children}
        </TooltipProvider>
      </AuthBootstrapProvider>
    </QueryClientProvider>
  );
}
