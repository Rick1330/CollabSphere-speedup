import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { InvitationsService } from "../../apps/api/src/invitations/invitations.service.js";
import { InvitationsNestController } from "../../apps/api/src/invitations/invitations.nest.controller.js";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";

const createController = () => {
  const service: Pick<
    InvitationsService,
    | "createInvitations"
    | "getInvitationPreviewByToken"
    | "acceptInvitationByToken"
    | "resendInvitation"
    | "revokeInvitation"
  > = {
    createInvitations: async ({ emails, role }) =>
      emails.map((email, index) => ({
        id: `inv-${index + 1}`,
        email,
        role,
        status: "pending",
        expiresAt: new Date("2026-05-15T00:00:00.000Z"),
      })),
    getInvitationPreviewByToken: async (token: string) => ({
      token,
      status: "pending",
      role: "MEMBER",
      invitedEmail: "x@example.com",
      expiresAt: new Date("2026-05-15T00:00:00.000Z"),
      workspace: { id: "w-1", name: "Workspace", description: "Demo" },
    }),
    acceptInvitationByToken: async ({ token }) => ({
      workspaceId: "w-1",
      token,
      membership: { role: "MEMBER", joinedAt: new Date("2026-05-08T00:00:00.000Z") },
    }),
    resendInvitation: async ({ invitationId }) => ({
      id: invitationId,
      status: "pending",
      role: "MEMBER",
      invitedEmail: "x@example.com",
      expiresAt: new Date("2026-05-20T00:00:00.000Z"),
    }),
    revokeInvitation: async ({ invitationId }) => ({ id: invitationId, status: "revoked" }),
  };

  return new InvitationsNestController(service as InvitationsService);
};

describe("api nest invitations controller", () => {
  it("returns envelopes for invitation routes", async () => {
    const controller = createController();
    const created = await controller.createInvitations("w-1", "user-1", {
      emails: ["a@example.com", "b@example.com"],
      role: "MEMBER",
    });
    assert.equal(created.data.total, 2);
    assert.equal(Array.isArray(created.data.items), true);

    const preview = await controller.getInvitationPreview("token-1");
    assert.equal(preview.data.resource.status, "pending");

    const accepted = await controller.acceptInvitation("token-1", "user-1");
    assert.equal(accepted.data.resource.workspaceId, "w-1");
  });

  it("rejects invalid create payload", async () => {
    const controller = createController();
    await assert.rejects(
      () =>
        controller.createInvitations("w-1", "user-1", {
          emails: [],
          role: "MEMBER",
        }),
      (error: unknown) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).code, "VALIDATION_ERROR");
        return true;
      },
    );
  });

  it("rejects missing auth context for protected routes", async () => {
    const controller = createController();
    await assert.rejects(
      () => controller.acceptInvitation("token-1", undefined),
      (error: unknown) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).code, "UNAUTHORIZED");
        return true;
      },
    );
  });
});
