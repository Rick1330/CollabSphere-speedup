import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const useWorkspaceRealtimeMock = vi.fn();

vi.mock("@/hooks/use-workspace-realtime", () => ({
  useWorkspaceRealtime: (...args: unknown[]) => useWorkspaceRealtimeMock(...args),
}));

vi.mock("@/lib/workspace-id", () => ({
  isDatabaseWorkspaceId: (id: string) => id.startsWith("ws-"),
}));

import { WorkspaceRealtimeLayout } from "./workspace-realtime-layout";

const WORKSPACE_ID = "ws-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("WorkspaceRealtimeLayout", () => {
  beforeEach(() => {
    useWorkspaceRealtimeMock.mockClear();
  });

  it("calls useWorkspaceRealtime with workspace id from route params", () => {
    render(
      <MemoryRouter initialEntries={[`/w/${WORKSPACE_ID}/documents/doc-1`]}>
        <Routes>
          <Route path="/w/:workspaceId" element={<WorkspaceRealtimeLayout />}>
            <Route path="documents/:documentId" element={<div>child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(useWorkspaceRealtimeMock).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it("does not join for non-database workspace ids", () => {
    render(
      <MemoryRouter initialEntries={["/w/demo-workspace/tasks"]}>
        <Routes>
          <Route path="/w/:workspaceId" element={<WorkspaceRealtimeLayout />}>
            <Route path="tasks" element={<div />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(useWorkspaceRealtimeMock).toHaveBeenCalledWith(undefined);
  });
});
