import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const ensureRealtimeConnectedMock = vi.fn();
const joinWorkspaceRoomMock = vi.fn();
const leaveWorkspaceRoomMock = vi.fn();
const onRealtimeReconnectMock = vi.fn();
const socketOnMock = vi.fn();
const socketOffMock = vi.fn();

const mockSocket = {
  on: socketOnMock,
  off: socketOffMock,
};

vi.mock("@/api/realtime/socket-client", () => ({
  ensureRealtimeConnected: (...args: unknown[]) => ensureRealtimeConnectedMock(...args),
  joinWorkspaceRoom: (...args: unknown[]) => joinWorkspaceRoomMock(...args),
  leaveWorkspaceRoom: (...args: unknown[]) => leaveWorkspaceRoomMock(...args),
  onRealtimeReconnect: (...args: unknown[]) => onRealtimeReconnectMock(...args),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/auth-session", () => ({
  useCurrentAccount: () => ({ id: "user-1" }),
  authSession: {
    patchSession: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

vi.mock("@/lib/workspace-id", () => ({
  isDatabaseWorkspaceId: (id: string) => id.startsWith("ws-"),
}));

import { useWorkspaceRealtime } from "./use-workspace-realtime";
import { queryKeys } from "@/lib/query-keys";

const WORKSPACE_ID = "ws-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useWorkspaceRealtime", () => {
  let queryClient: QueryClient;
  let reconnectHandler: (() => void) | undefined;
  const handlers = new Map<string, (payload: unknown) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    reconnectHandler = undefined;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    ensureRealtimeConnectedMock.mockResolvedValue(mockSocket);
    joinWorkspaceRoomMock.mockResolvedValue(undefined);
    leaveWorkspaceRoomMock.mockResolvedValue(undefined);
    onRealtimeReconnectMock.mockImplementation((listener: () => void) => {
      reconnectHandler = listener;
      return () => undefined;
    });
    socketOnMock.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
    });
  });

  it("joins workspace room and registers handlers on mount", async () => {
    renderHook(() => useWorkspaceRealtime(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(joinWorkspaceRoomMock).toHaveBeenCalledWith(WORKSPACE_ID);
    });
    expect(handlers.has("task:moved")).toBe(true);
    expect(handlers.has("workspace:role_changed")).toBe(true);
  });

  it("leaves workspace room on unmount", async () => {
    const { unmount } = renderHook(() => useWorkspaceRealtime(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(joinWorkspaceRoomMock).toHaveBeenCalled());
    unmount();
    expect(leaveWorkspaceRoomMock).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it("patches task board cache on task:moved", async () => {
    const boardKey = queryKeys.tasks.board(WORKSPACE_ID);
    queryClient.setQueryData(boardKey, {
      t1: {
        id: "t1",
        status: "todo",
        position: 1,
        title: "A",
        priority: "medium",
        assignee: null,
        dueDate: null,
        labels: [],
        commentCount: 0,
        description: null,
        reporterId: "u1",
        reporterName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        linkedResources: [],
        comments: [],
      },
    });

    renderHook(() => useWorkspaceRealtime(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(handlers.has("task:moved")).toBe(true));
    handlers.get("task:moved")?.({
      workspaceId: WORKSPACE_ID,
      taskId: "t1",
      toStatus: "in_progress",
      position: 2,
    });

    const board = queryClient.getQueryData<Record<string, { status: string; position: number }>>(
      boardKey,
    );
    expect(board?.t1.status).toBe("in_progress");
    expect(board?.t1.position).toBe(2);
  });

  it("invalidates members on workspace:member_joined", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useWorkspaceRealtime(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(handlers.has("workspace:member_joined")).toBe(true));
    handlers.get("workspace:member_joined")?.({
      workspaceId: WORKSPACE_ID,
      userId: "user-2",
      role: "MEMBER",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workspaces.members(WORKSPACE_ID),
    });
  });

  it("re-joins on reconnect callback", async () => {
    renderHook(() => useWorkspaceRealtime(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(reconnectHandler).toBeDefined());
    joinWorkspaceRoomMock.mockClear();
    reconnectHandler?.();
    await waitFor(() => expect(joinWorkspaceRoomMock).toHaveBeenCalledWith(WORKSPACE_ID));
  });
});
