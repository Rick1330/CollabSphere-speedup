import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WorkspacesNestController } from "../../apps/api/src/workspaces/workspaces.nest.controller.js";
import type { WorkspacesService } from "../../apps/api/src/workspaces/workspaces.service.js";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";

const createController = () => {
  const service: Pick<
    WorkspacesService,
    "listForUser" | "getByIdForUser" | "listMembersForUser" | "updateMemberRole" | "removeMember"
  > = {
    listForUser: async (userId: string) => [{ id: "ws-1", userId }],
    getByIdForUser: async ({ userId, workspaceId }) => ({ workspaceId, userId }),
    listMembersForUser: async ({ workspaceId }) => [{ id: "m-1", workspaceId }],
    updateMemberRole: async ({ role }) => ({ id: "m-1", role }),
    removeMember: async ({ membershipId }) => ({ id: membershipId, isActive: false }),
  };

  return {
    controller: new WorkspacesNestController(service as WorkspacesService),
  };
};

describe("api nest workspaces controller", () => {
  it("returns envelope for list endpoints", async () => {
    const { controller } = createController();
    const workspaces = await controller.listWorkspaces("user-1");
    assert.equal(Array.isArray(workspaces.data.items), true);
    assert.equal(workspaces.data.total, 1);
    assert.equal(typeof workspaces.meta.requestId, "string");

    const members = await controller.listMembers("workspace-1", "user-1");
    assert.equal(Array.isArray(members.data.items), true);
    assert.equal(members.data.total, 1);
    assert.equal(typeof members.meta.timestamp, "string");
  });

  it("rejects missing auth context", async () => {
    const { controller } = createController();
    await assert.rejects(() => controller.listWorkspaces(undefined), (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "UNAUTHORIZED");
      return true;
    });
  });

  it("validates role payload before update", async () => {
    const { controller } = createController();
    await assert.rejects(
      () =>
        controller.updateMemberRole("workspace-1", "member-1", "user-1", {
          role: "INVALID" as never,
        }),
      (error: unknown) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).code, "VALIDATION_ERROR");
        return true;
      },
    );
  });
});
