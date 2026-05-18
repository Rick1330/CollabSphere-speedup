import { describe, expect, it, vi, beforeEach } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { resetAuthQueryCache, teardownAuthSession } from "@/lib/auth-teardown";
import { authSession } from "@/lib/auth-session";

vi.mock("@/api/adapters/auth", () => ({
  logoutApi: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/api/realtime/socket-client", () => ({
  disconnectRealtime: vi.fn(),
}));

const { logoutApi } = await import("@/api/adapters/auth");
const { disconnectRealtime } = await import("@/api/realtime/socket-client");

function createMockQueryClient(): QueryClient {
  return {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  } as unknown as QueryClient;
}

describe("resetAuthQueryCache", () => {
  it("cancels and clears all queries", async () => {
    const queryClient = createMockQueryClient();
    await resetAuthQueryCache(queryClient);
    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
  });
});

describe("teardownAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.signIn("user-a", { accessToken: "token-a" });
  });

  it("clears session, query cache, and realtime on sign-out", async () => {
    const queryClient = createMockQueryClient();
    await teardownAuthSession(queryClient, { callApiLogout: true });

    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(disconnectRealtime).toHaveBeenCalled();
    expect(logoutApi).toHaveBeenCalled();
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("skips API logout when callApiLogout is false", async () => {
    const queryClient = createMockQueryClient();
    await teardownAuthSession(queryClient, { callApiLogout: false });

    expect(logoutApi).not.toHaveBeenCalled();
    expect(authSession.getAccessToken()).toBeNull();
  });
});
