import type { QueryClient } from "@tanstack/react-query";
import { logoutApi } from "@/api/adapters/auth";
import { disconnectRealtime } from "@/api/realtime/socket-client";
import { authSession, clearOAuthHashFromUrl } from "@/lib/auth-session";

export type TeardownAuthSessionOptions = {
  /** When false, skip POST /auth/logout (e.g. before a fresh login). Default true. */
  callApiLogout?: boolean;
};

/** Drop cached API data so the next user never sees the previous account's queries. */
export async function resetAuthQueryCache(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}

/**
 * Full client teardown for sign-out or account switch.
 * Clears React Query, realtime socket, local session, and best-effort API logout.
 */
export async function teardownAuthSession(
  queryClient: QueryClient,
  options?: TeardownAuthSessionOptions,
): Promise<void> {
  await resetAuthQueryCache(queryClient);
  disconnectRealtime();
  clearOAuthHashFromUrl();
  authSession.signOut();

  if (options?.callApiLogout !== false) {
    await logoutApi();
  }
}
