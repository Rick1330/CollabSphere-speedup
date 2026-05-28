import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/client", () => ({
  request: vi.fn(),
}));

import { request } from "@/api/client";
import { listWorkspaceTemplatesFromApi } from "./templates";

const workspaceContent = {
  structure: {
    workspace: {
      folders: [{ name: "Research" }],
      documents: [{ title: "Outline", folderKey: "Research" }],
      taskBoard: { columns: [{ name: "Todo" }] },
      defaults: {
        roleLabels: { MEMBER: "Student" },
        workspaceSettings: { submissionWorkflowEnabled: true },
      },
    },
  },
};

describe("listWorkspaceTemplatesFromApi", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it("filters legacy workspace template ids from API payload", async () => {
    vi.mocked(request).mockResolvedValue({
      data: {
        items: [
          {
            id: "academic-thesis",
            kind: "workspace",
            category: "academic",
            name: "Legacy thesis",
            description: "Old seed",
          },
          {
            id: "tpl_workspace_academic_senior_project_v1",
            kind: "workspace",
            category: "academic",
            name: "Senior Project",
            description: "Current catalog",
            content: workspaceContent,
          },
        ],
        total: 2,
      },
    });

    const templates = await listWorkspaceTemplatesFromApi("academic");
    expect(templates.map((t) => t.id)).toEqual(["tpl_workspace_academic_senior_project_v1"]);
    expect(templates[0]?.name).toBe("Senior Project");
  });
});
