import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { WorkspaceRole } from "@prisma/client";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import { AppError } from "../common/filters/app-error.filter.js";
import {
  createActionResponsePayload,
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { WorkspacesService } from "./workspaces.service.js";
import {
  CreateWorkspaceDto,
  TransferOwnershipDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberRoleDto,
} from "./workspaces.dto.js";

@Controller("workspaces")
export class WorkspacesNestController {
  constructor(@Inject(WorkspacesService) private readonly workspacesService: WorkspacesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: CreateWorkspaceDto,
  ) {
    const data = await this.workspacesService.createWorkspace({
      actorUserId,
      ...body,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ workspace: data }),
      requestId,
    });
  }

  @Get()
  async listWorkspaces(@ReqRequestId() requestId: string, @CurrentUserId() userId: string) {
    const data = await this.workspacesService.listForUser(userId);
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId,
    });
  }

  @Get(":workspaceId")
  @UseGuards(WorkspaceMembershipGuard)
  async getWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Req() req: Request,
    @ReqRequestId() requestId: string,
  ) {
    const wm = req.workspaceMember;
    if (!wm) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Missing workspace membership context.",
      });
    }
    const data = await this.workspacesService.getByIdForUser({
      workspaceId,
      membership: { id: wm.id, role: wm.role as WorkspaceRole, workspaceId: wm.workspaceId },
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Get(":workspaceId/task-labels")
  @UseGuards(WorkspaceMembershipGuard)
  async listTaskLabels(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.listTaskLabelsForUser({
      actorUserId,
      workspaceId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId,
    });
  }

  @Post(":workspaceId/task-labels")
  @UseGuards(WorkspaceMembershipGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTaskLabel(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: { name: string; color?: string; description?: string | null },
  ) {
    const data = await this.workspacesService.createTaskLabelForUser({
      actorUserId,
      workspaceId,
      name: body.name,
      color: body.color,
      description: body.description,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ label: data }),
      requestId,
    });
  }

  @Get(":workspaceId/task-columns")
  @UseGuards(WorkspaceMembershipGuard)
  async listTaskColumns(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.listTaskColumnsForUser({
      actorUserId,
      workspaceId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId,
    });
  }

  @Get(":workspaceId/members")
  @UseGuards(WorkspaceMembershipGuard)
  async listMembers(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() _userId: string,
  ) {
    const data = await this.workspacesService.listMembersForUser({ workspaceId });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId,
    });
  }

  @Get(":workspaceId/members/by-user/:userId/profile")
  @UseGuards(WorkspaceMembershipGuard)
  async getWorkspaceMemberPeerProfile(
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.getWorkspaceMemberPeerProfile({
      workspaceId,
      actorUserId,
      targetUserId: userId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Patch(":workspaceId/members/:membershipId/role")
  @UseGuards(WorkspaceMembershipGuard)
  async updateMemberRole(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateWorkspaceMemberRoleDto,
  ) {
    const data = await this.workspacesService.updateMemberRole({
      actorUserId: userId,
      workspaceId,
      membershipId,
      role: body.role,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Delete(":workspaceId/members/:membershipId")
  @UseGuards(WorkspaceMembershipGuard)
  async removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.workspacesService.removeMember({
      actorUserId: userId,
      workspaceId,
      membershipId,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Put(":workspaceId")
  @UseGuards(WorkspaceMembershipGuard)
  async updateWorkspace(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: UpdateWorkspaceDto,
  ) {
    const data = await this.workspacesService.updateWorkspaceSettings({
      actorUserId,
      workspaceId,
      ...body,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post(":workspaceId/archive")
  @UseGuards(WorkspaceMembershipGuard)
  async archiveWorkspace(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.setWorkspaceArchivedStatus({
      actorUserId,
      workspaceId,
      status: "archived",
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post(":workspaceId/unarchive")
  @UseGuards(WorkspaceMembershipGuard)
  async unarchiveWorkspace(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.setWorkspaceArchivedStatus({
      actorUserId,
      workspaceId,
      status: "active",
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Delete(":workspaceId")
  @UseGuards(WorkspaceMembershipGuard)
  async deleteWorkspace(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.workspacesService.deleteWorkspace({ actorUserId, workspaceId });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: data.message }),
      requestId,
    });
  }

  @Post(":workspaceId/transfer-ownership")
  @UseGuards(WorkspaceMembershipGuard)
  async transferOwnership(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: TransferOwnershipDto,
  ) {
    const data = await this.workspacesService.transferOwnership({
      actorUserId,
      workspaceId,
      newOwnerUserId: body.newOwnerUserId,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }
}
