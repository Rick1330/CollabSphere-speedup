import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { DocxImportService } from "./docx-import.service.js";
import { DocumentsService } from "./documents.service.js";
import {
  CreateDocumentDto,
  UpdateDocumentContentDto,
  UpdateDocumentDto,
  TransitionNoteDto,
  PatchDocumentVariablesDto,
  PatchDocumentVersionLabelDto,
  CreateDocumentVersionDto,
} from "./documents.dto.js";

@Controller("workspaces/:workspaceId/documents")
@UseGuards(WorkspaceMembershipGuard)
export class DocumentsNestController {
  constructor(
    @Inject(DocumentsService) private readonly documentsService: DocumentsService,
    @Inject(DocxImportService) private readonly docxImportService: DocxImportService,
  ) {}

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

  @Post(":documentId/import/docx")
  @WorkspaceRoleAtLeast("MEMBER")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async importDocx(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ) {
    await this.documentsService.getDocumentByIdForUser({
      actorUserId,
      workspaceId,
      documentId,
    });

    if (!file?.buffer?.length) {
      throw new BadRequestException("DOCX file is required");
    }

    const queued = await this.docxImportService.enqueueDocxImport({
      actorUserId,
      workspaceId,
      documentId,
      fileBuffer: file.buffer,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({
        importJobId: queued.importJobId,
        status: queued.status,
      }),
      requestId,
    });
  }

  @Get(":documentId/import/docx/:importJobId")
  async getDocxImportStatus(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @Param("importJobId") importJobId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    await this.documentsService.getDocumentByIdForUser({
      actorUserId,
      workspaceId,
      documentId,
    });

    const status = await this.docxImportService.getDocxImportStatus(importJobId);
    if (!status) {
      throw new BadRequestException("DOCX import job not found");
    }

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ importJob: status }),
      requestId,
    });
  }

  @Get(":documentId/debug/ydoc-size")
  async debugYDocSize(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const data = await this.documentsService.debugYDocSize({
      actorUserId,
      workspaceId,
      documentId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
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

  @Post(":documentId/versions")
  async createVersion(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @Body() body: CreateDocumentVersionDto,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const version = await this.documentsService.createManualDocumentVersion({
      actorUserId,
      workspaceId,
      documentId,
      versionLabel: body.versionLabel,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ version }),
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

  @Get(":documentId/versions/:versionId")
  async getVersionDetail(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const version = await this.documentsService.getDocumentVersionDetail({
      actorUserId,
      workspaceId,
      documentId,
      versionId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ version }),
      requestId,
    });
  }

  @Patch(":documentId/versions/:versionId")
  async patchVersionLabel(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @Body() body: PatchDocumentVersionLabelDto,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const version = await this.documentsService.updateDocumentVersionLabel({
      actorUserId,
      workspaceId,
      documentId,
      versionId,
      versionLabel: body.versionLabel,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ version }),
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
