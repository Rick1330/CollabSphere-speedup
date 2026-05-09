import { Body, Controller, Delete, Inject, Param, Patch, Post } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import { createActionResponsePayload, createSingleResourcePayload, wrapSuccessResponse } from "../common/interceptors/response-envelope.interceptor.js";
import { FoldersService } from "./folders.service.js";

@Controller("workspaces/:workspaceId/folders")
export class FoldersNestController {
  constructor(@Inject(FoldersService) private readonly foldersService: FoldersService) {}

  @Post()
  async create(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: { name: string; parentId?: string | null },
  ) {
    const folder = await this.foldersService.createFolder({
      actorUserId,
      workspaceId,
      name: String(body?.name ?? ""),
      parentId: body?.parentId === undefined ? undefined : (body.parentId || null),
    });
    return { statusCode: 201, ...wrapSuccessResponse({ payload: createSingleResourcePayload({ folder }), requestId }) };
  }

  @Patch(":folderId")
  async rename(
    @Param("workspaceId") workspaceId: string,
    @Param("folderId") folderId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: { name: string },
  ) {
    const folder = await this.foldersService.renameFolder({ actorUserId, workspaceId, folderId, name: String(body?.name ?? "") });
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
