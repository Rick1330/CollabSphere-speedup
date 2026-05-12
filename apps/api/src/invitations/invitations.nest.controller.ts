import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { InvitationsService } from "./invitations.service.js";
import { CreateInvitationsDto } from "./invitations.dto.js";

@Controller()
export class InvitationsNestController {
  constructor(
    @Inject(InvitationsService) private readonly invitationsService: InvitationsService,
  ) {}

  @Post("workspaces/:workspaceId/invitations")
  @UseGuards(WorkspaceMembershipGuard)
  async createInvitations(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: CreateInvitationsDto,
  ) {
    const created = await this.invitationsService.createInvitations({
      workspaceId,
      actorUserId,
      emails: body.emails,
      role: body.role,
    });

    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: created, total: created.length }),
      requestId,
    });
  }

  @Get("workspaces/:workspaceId/invitations")
  @UseGuards(WorkspaceMembershipGuard)
  async listWorkspaceInvitations(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const items = await this.invitationsService.listWorkspaceInvitations({
      workspaceId,
      actorUserId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total: items.length }),
      requestId,
    });
  }

  @Public()
  @Get("invitations/:token")
  async getInvitationPreview(
    @Param("token") token: string,
    @ReqRequestId() requestId: string,
  ) {
    const preview = await this.invitationsService.getInvitationPreviewByToken(token);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(preview),
      requestId,
    });
  }

  @Post("invitations/:token/accept")
  async acceptInvitation(
    @Param("token") token: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.invitationsService.acceptInvitationByToken({ token, userId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post("workspaces/:workspaceId/invitations/:invitationId/resend")
  @UseGuards(WorkspaceMembershipGuard)
  async resendInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.invitationsService.resendInvitation({
      workspaceId,
      invitationId,
      actorUserId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post("workspaces/:workspaceId/invitations/:invitationId/revoke")
  @UseGuards(WorkspaceMembershipGuard)
  async revokeInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.invitationsService.revokeInvitation({
      workspaceId,
      invitationId,
      actorUserId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }
}
