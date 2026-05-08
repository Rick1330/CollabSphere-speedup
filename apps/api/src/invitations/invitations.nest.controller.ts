import type { WorkspaceRole } from "@prisma/client";
import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { resolveRequestUserId } from "../common/auth/request-user.js";
import { ValidationAppError } from "../common/filters/app-error.filter.js";
import {
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { InvitationsService } from "./invitations.service.js";

type CreateInvitationsBody = {
  emails: string[];
  role: WorkspaceRole;
};

const validWorkspaceRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

@Controller()
export class InvitationsNestController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post("workspaces/:workspaceId/invitations")
  async createInvitations(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: CreateInvitationsBody,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const payload = this.validateCreatePayload(body);
    const created = await this.invitationsService.createInvitations({
      workspaceId,
      actorUserId,
      emails: payload.emails,
      role: payload.role,
    });

    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: created, total: created.length }),
      requestId: "nest-request",
    });
  }

  @Get("invitations/:token")
  async getInvitationPreview(@Param("token") token: string) {
    const preview = await this.invitationsService.getInvitationPreviewByToken(token);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(preview),
      requestId: "nest-request",
    });
  }

  @Post("invitations/:token/accept")
  async acceptInvitation(
    @Param("token") token: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const userId = resolveRequestUserId(userIdHeader);
    const data = await this.invitationsService.acceptInvitationByToken({ token, userId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Post("workspaces/:workspaceId/invitations/:invitationId/resend")
  async resendInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const data = await this.invitationsService.resendInvitation({
      workspaceId,
      invitationId,
      actorUserId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Post("workspaces/:workspaceId/invitations/:invitationId/revoke")
  async revokeInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const data = await this.invitationsService.revokeInvitation({
      workspaceId,
      invitationId,
      actorUserId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  private validateCreatePayload(raw: CreateInvitationsBody) {
    if (!raw || typeof raw !== "object") {
      throw new ValidationAppError({
        message: "Invitation payload is required.",
        issues: [{ field: "body", rule: "required", message: "Invitation payload is required." }],
      });
    }

    if (!Array.isArray(raw.emails) || raw.emails.length === 0) {
      throw new ValidationAppError({
        message: "At least one email is required.",
        issues: [{ field: "emails", rule: "required", message: "At least one email is required." }],
      });
    }

    if (typeof raw.role !== "string" || !validWorkspaceRoles.includes(raw.role)) {
      throw new ValidationAppError({
        message: "Role is invalid.",
        issues: [{ field: "role", rule: "enum", message: "Role is invalid." }],
      });
    }

    return {
      emails: raw.emails,
      role: raw.role,
    };
  }
}
