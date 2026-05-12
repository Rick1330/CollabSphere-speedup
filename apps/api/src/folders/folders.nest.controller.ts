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

@Controller("workspaces/:workspaceId/folders")
export class FoldersNestController {
  constructor(@Inject(FoldersService) private readonly foldersService: FoldersService) {}

  @Post()
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
  async rename(
    @Param("workspaceId") workspaceId: string,
    @Param("folderId") folderId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: RenameFolderDto,
  ) {
    const folder = await this.foldersService.renameFolder({
      actorUserId,
      workspaceId,
      folderId,
      name: body.name,
    });
    return wrapSuccessResponse({ payload: createSingleResourcePayload({ folder }), requestId });
  }

  @Delete(":folderId")
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
