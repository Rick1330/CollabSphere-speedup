/**
 * App-level providers.
 *
 * Wraps the application with React Query, tooltip, toast providers, and
 * mounts the global theme listener so the resolved theme tracks the user's
 * system preference live (when their preference is "system") and applies
 * any manual override they've chosen on every page — not just settings.
 */
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { configureApiClient, getBrowserDevApiBaseUrl } from "@/api/client";
import { authSession } from "@/lib/auth-session";

/** Mount-only component so the theme hook runs once at the root. */
function ThemeListener() {
  useThemePreference();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isApiConfigured] = useState(() => {
    configureApiClient({
      baseUrl:
        import.meta.env.VITE_API_BASE_URL ?? getBrowserDevApiBaseUrl() ?? "/api/v1",
      getAuthToken: () => authSession.getAccessToken(),
    });
    return true;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isApiConfigured && null}
        <ThemeListener />
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
