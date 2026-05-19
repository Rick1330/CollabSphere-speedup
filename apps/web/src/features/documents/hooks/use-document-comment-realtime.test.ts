import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const ensureRealtimeConnectedMock = vi.fn();
const joinWorkspaceRoomMock = vi.fn();
const subscribeCommentEventsMock = vi.fn();

vi.mock("@/api/realtime/socket-client", () => ({
  ensureRealtimeConnected: (...args: unknown[]) => ensureRealtimeConnectedMock(...args),
  joinWorkspaceRoom: (...args: unknown[]) => joinWorkspaceRoomMock(...args),
  subscribeCommentEvents: (...args: unknown[]) => subscribeCommentEventsMock(...args),
}));

import { useDocumentCommentRealtime } from "./use-document-comment-realtime";

const WORKSPACE_ID = "ws-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DOCUMENT_ID = "doc-11111111-1111-1111-1111-111111111111";

describe("useDocumentCommentRealtime", () => {
  let handler: ((event: string, payload: unknown) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = undefined;
    ensureRealtimeConnectedMock.mockResolvedValue({});
    joinWorkspaceRoomMock.mockResolvedValue(undefined);
    subscribeCommentEventsMock.mockImplementation((cb) => {
      handler = cb;
      return () => undefined;
    });
  });

  it("joins workspace room and refetches on matching comment:created", async () => {
    const onRefetch = vi.fn();

    renderHook(() =>
      useDocumentCommentRealtime({
        workspaceId: WORKSPACE_ID,
        documentId: DOCUMENT_ID,
        currentUserId: "user-b",
        onRefetch,
      }),
    );

    await waitFor(() => expect(joinWorkspaceRoomMock).toHaveBeenCalledWith(WORKSPACE_ID));

    handler?.("comment:created", {
      workspaceId: WORKSPACE_ID,
      targetType: "document",
      targetId: DOCUMENT_ID,
      authorId: "user-a",
    });

    await waitFor(() => expect(onRefetch).toHaveBeenCalled(), { timeout: 500 });
  });

  it("skips refetch for own comment:created events", async () => {
    const onRefetch = vi.fn();

    renderHook(() =>
      useDocumentCommentRealtime({
        workspaceId: WORKSPACE_ID,
        documentId: DOCUMENT_ID,
        currentUserId: "user-a",
        onRefetch,
      }),
    );

    await waitFor(() => expect(subscribeCommentEventsMock).toHaveBeenCalled());

    handler?.("comment:created", {
      workspaceId: WORKSPACE_ID,
      targetType: "document",
      targetId: DOCUMENT_ID,
      authorId: "user-a",
    });

    await new Promise((r) => setTimeout(r, 250));
    expect(onRefetch).not.toHaveBeenCalled();
  });
});
