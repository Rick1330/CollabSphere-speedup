import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { WorkspaceRoleAtLeast } from "../common/decorators/workspace-role.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { DocumentsService } from "./documents.service.js";
import {
  CreateDocumentDto,
  UpdateDocumentContentDto,
  UpdateDocumentDto,
  TransitionNoteDto,
  PatchDocumentVariablesDto,
} from "./documents.dto.js";

@Controller("workspaces/:workspaceId/documents")
@UseGuards(WorkspaceMembershipGuard)
export class DocumentsNestController {
  constructor(@Inject(DocumentsService) private readonly documentsService: DocumentsService) {}

  @Get()
  async listDocuments(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Query("folderId") folderIdQuery?: string,
  ) {
    const folderId = folderIdQuery ? folderIdQuery.trim() : undefined;
    const items = await this.documentsService.listDocumentsForUser({
      actorUserId,
      workspaceId,
      folderId,
    });

    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total: items.length }),
      requestId,
    });
  }

  @Get("tree")
  async getTree(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.documentsService.getDocumentsTree({
      actorUserId,
      workspaceId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Patch(":documentId/variables")
  async patchDocumentVariables(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: PatchDocumentVariablesDto,
  ) {
    const data = await this.documentsService.patchDocumentVariables({
      actorUserId,
      workspaceId,
      documentId,
      variables: body.variables.map((v) => ({ variableKey: v.variableKey, value: v.value })),
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({
        message: "Variables updated.",
        extraData: data,
      }),
      requestId,
    });
  }

  @Get(":documentId")
  async getDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const document = await this.documentsService.getDocumentByIdForUser({
      actorUserId,
      workspaceId,
      documentId,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Post()
  @WorkspaceRoleAtLeast("MEMBER")
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: CreateDocumentDto,
  ) {
    const document = await this.documentsService.createDocument({
      actorUserId,
      workspaceId,
      ...body,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Put(":documentId")
  @WorkspaceRoleAtLeast("MEMBER")
  async updateDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: UpdateDocumentDto,
  ) {
    const document = await this.documentsService.updateDocumentMetadata({
      actorUserId,
      workspaceId,
      documentId,
      ...body,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Put(":documentId/content")
  async updateDocumentContent(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: UpdateDocumentContentDto,
  ) {
    const data = await this.documentsService.updateDocumentContent({
      actorUserId,
      workspaceId,
      documentId,
      ...body,
      reason: body.reason ?? "manual_edit",
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Delete(":documentId")
  @WorkspaceRoleAtLeast("MANAGER")
  async deleteDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.documentsService.softDeleteDocument({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: data.message }),
      requestId,
    });
  }

  @Post(":documentId/lock")
  async lockDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const document = await this.documentsService.lockDocument({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Post(":documentId/unlock")
  async unlockDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const document = await this.documentsService.unlockDocument({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Get(":documentId/versions")
  async listVersions(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const { items, total } = await this.documentsService.listDocumentVersions({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total }),
      requestId,
    });
  }

  @Post(":documentId/versions/:versionId/restore")
  async restoreVersion(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const document = await this.documentsService.restoreDocumentVersion({
      actorUserId,
      workspaceId,
      documentId,
      versionId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ document }),
      requestId,
    });
  }

  @Get(":documentId/submissions")
  async listSubmissions(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const { items, total } = await this.documentsService.listDocumentSubmissions({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total }),
      requestId,
    });
  }

  @Post(":documentId/submit")
  async submitDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.documentsService.transitionDocumentStatus({
      actorUserId,
      workspaceId,
      documentId,
      action: "submit",
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post(":documentId/request-changes")
  async requestChanges(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: TransitionNoteDto,
  ) {
    const data = await this.documentsService.transitionDocumentStatus({
      actorUserId,
      workspaceId,
      documentId,
      action: "request_changes",
      note: body.note,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Post(":documentId/approve")
  async approveDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.documentsService.transitionDocumentStatus({
      actorUserId,
      workspaceId,
      documentId,
      action: "approve",
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }
}
