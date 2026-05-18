import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { subscribeCommentEventsMock, ensureRealtimeConnectedMock } = vi.hoisted(() => ({
  subscribeCommentEventsMock: vi.fn(),
  ensureRealtimeConnectedMock: vi.fn(),
}));

vi.mock("@/api/realtime/socket-client", () => ({
  subscribeCommentEvents: subscribeCommentEventsMock,
  ensureRealtimeConnected: ensureRealtimeConnectedMock,
}));

import { useDocumentCommentRealtime } from "./use-document-comment-realtime";

describe("useDocumentCommentRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscribeCommentEventsMock.mockReset();
    subscribeCommentEventsMock.mockReturnValue(() => {});
    ensureRealtimeConnectedMock.mockReset();
    ensureRealtimeConnectedMock.mockResolvedValue({ connected: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches when document comment event matches target", async () => {
    let handler: ((event: string, payload: unknown) => void) | null = null;
    subscribeCommentEventsMock.mockImplementation((onEvent) => {
      handler = onEvent;
      return () => {};
    });

    const onRefetch = vi.fn();
    renderHook(() =>
      useDocumentCommentRealtime({
        workspaceId: "ws-1",
        documentId: "doc-1",
        currentUserId: "user-1",
        onRefetch,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      handler?.("comment:reply_created", {
        targetType: "document",
        targetId: "doc-1",
        threadId: "thread-1",
      });
      vi.advanceTimersByTime(160);
    });

    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  it("ignores events for other documents", async () => {
    let handler: ((event: string, payload: unknown) => void) | null = null;
    subscribeCommentEventsMock.mockImplementation((onEvent) => {
      handler = onEvent;
      return () => {};
    });

    const onRefetch = vi.fn();
    renderHook(() =>
      useDocumentCommentRealtime({
        workspaceId: "ws-1",
        documentId: "doc-1",
        currentUserId: "user-1",
        onRefetch,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      handler?.("comment:reply_created", {
        targetType: "document",
        targetId: "doc-other",
        threadId: "thread-1",
      });
      vi.advanceTimersByTime(160);
    });

    expect(onRefetch).not.toHaveBeenCalled();
  });
});
