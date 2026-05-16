import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { FoldersService } from "./folders.service.js";
import { CreateFolderDto, RenameFolderDto } from "./folders.dto.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { WorkspaceRoleAtLeast } from "../common/decorators/workspace-role.decorator.js";

@Controller("workspaces/:workspaceId/folders")
@UseGuards(WorkspaceMembershipGuard)
export class FoldersNestController {
  constructor(@Inject(FoldersService) private readonly foldersService: FoldersService) {}

  @Post()
  @WorkspaceRoleAtLeast("MEMBER")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: CreateFolderDto,
  ) {
    const folder = await this.foldersService.createFolder({
      actorUserId,
      workspaceId,
      ...body,
    });
    return wrapSuccessResponse({ payload: createSingleResourcePayload({ folder }), requestId });
  }

  @Patch(":folderId")
  @WorkspaceRoleAtLeast("MEMBER")
  async rename(
    @Param("workspaceId") workspaceId: string,
    @Param("folderId") folderId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: RenameFolderDto,
  ) {
    const folder = await this.foldersService.updateFolder({
      actorUserId,
      workspaceId,
      folderId,
      name: body.name,
      parentId: body.parentId,
    });
    return wrapSuccessResponse({ payload: createSingleResourcePayload({ folder }), requestId });
  }

  @Delete(":folderId")
  @WorkspaceRoleAtLeast("MANAGER")
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("folderId") folderId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const result = await this.foldersService.deleteFolder({ actorUserId, workspaceId, folderId });
    return wrapSuccessResponse({ payload: createActionResponsePayload({ message: result.message }), requestId });
  }
}
