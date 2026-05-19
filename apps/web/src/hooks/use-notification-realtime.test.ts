import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ensureRealtimeConnectedMock = vi.fn();
const subscribeNotificationEventsMock = vi.fn();

vi.mock("@/api/realtime/socket-client", () => ({
  ensureRealtimeConnected: (...args: unknown[]) => ensureRealtimeConnectedMock(...args),
  subscribeNotificationEvents: (...args: unknown[]) => subscribeNotificationEventsMock(...args),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn() },
}));

vi.mock("@/lib/auth-session", () => ({
  useCurrentAccount: () => ({ id: "user-1" }),
}));

import { useNotificationRealtime } from "./use-notification-realtime";
import { queryKeys } from "@/lib/query-keys";

describe("useNotificationRealtime", () => {
  let queryClient: QueryClient;
  let handler: ((event: string, payload: unknown) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = undefined;
    queryClient = new QueryClient();
    ensureRealtimeConnectedMock.mockResolvedValue({});
    subscribeNotificationEventsMock.mockImplementation((cb) => {
      handler = cb;
      return () => undefined;
    });
  });

  const wrapper =
    (client: QueryClient) =>
    ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

  it("invalidates notification and unread-count queries on notification:created", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useNotificationRealtime(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(handler).toBeDefined());

    handler?.("notification:created", { id: "n1" });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.unreadCount(),
    });
  });
});
