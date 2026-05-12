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
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
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
@UseGuards(WorkspaceMembershipGuard)
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
  async getWorkspace(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.workspacesService.getByIdForUser({ userId, workspaceId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Get(":workspaceId/members")
  async listMembers(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.workspacesService.listMembersForUser({ userId, workspaceId });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId,
    });
  }

  @Patch(":workspaceId/members/:membershipId/role")
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
