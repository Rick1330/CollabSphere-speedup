import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("@/api/client", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import { updateWorkspaceSettings } from "./workspaces";

const WORKSPACE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("updateWorkspaceSettings", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("PUTs trimmed identity fields to the workspace endpoint", async () => {
    requestMock.mockResolvedValue({
      data: {
        workspaceId: WORKSPACE_ID,
        updatedAt: "2026-05-28T12:00:00.000Z",
      },
    });

    const result = await updateWorkspaceSettings(WORKSPACE_ID, {
      name: "  Thesis Lab  ",
      description: "  Updated summary  ",
      icon: "🎓",
    });

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}`, {
      method: "PUT",
      body: {
        name: "Thesis Lab",
        description: "Updated summary",
        icon: "🎓",
      },
    });
    expect(result.workspaceId).toBe(WORKSPACE_ID);
  });

  it("sends null for cleared optional fields", async () => {
    requestMock.mockResolvedValue({
      data: {
        workspaceId: WORKSPACE_ID,
        updatedAt: "2026-05-28T12:00:00.000Z",
      },
    });

    await updateWorkspaceSettings(WORKSPACE_ID, {
      description: "",
      icon: null,
    });

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}`, {
      method: "PUT",
      body: {
        description: null,
        icon: null,
      },
    });
  });
});
