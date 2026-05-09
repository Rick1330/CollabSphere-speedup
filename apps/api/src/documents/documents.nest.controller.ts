import type { DocumentStatus } from "@prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { ValidationAppError } from "../common/filters/app-error.filter.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { DocumentsService } from "./documents.service.js";

type CreateDocumentBody = {
  title: string;
  folderId?: string | null;
  templateId?: string | null;
};

type UpdateDocumentBody = {
  title?: string | null;
  folderId?: string | null;
  status?: DocumentStatus | null;
};

type UpdateDocumentContentBody = {
  contentPlaintext: string;
  yjsStateBase64?: string | null;
  reason?: string | null;
  blockTypes?: string[] | null;
};

type TransitionNoteBody = {
  note?: string | null;
};

const validDocumentStatus: DocumentStatus[] = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "archived",
];

@Controller("workspaces/:workspaceId/documents")
@UseGuards(WorkspaceMembershipGuard)
export class DocumentsNestController {
  constructor(
    @Inject(DocumentsService) private readonly documentsService: DocumentsService,
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
  async createDocument(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: CreateDocumentBody,
  ) {
    const payload = this.validateCreatePayload(body);
    const document = await this.documentsService.createDocument({
      actorUserId,
      workspaceId,
      ...payload,
    });

    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ document }),
        requestId,
      }),
    };
  }

  @Put(":documentId")
  async updateDocument(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: UpdateDocumentBody,
  ) {
    const payload = this.validateUpdatePayload(body);
    const document = await this.documentsService.updateDocumentMetadata({
      actorUserId,
      workspaceId,
      documentId,
      ...payload,
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
    @Body() body: UpdateDocumentContentBody,
  ) {
    const payload = this.validateContentUpdatePayload(body);
    const data = await this.documentsService.updateDocumentContent({
      actorUserId,
      workspaceId,
      documentId,
      ...payload,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Delete(":documentId")
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
    @Body() body: TransitionNoteBody,
  ) {
    const note = this.validateRequiredNote(body);
    const data = await this.documentsService.transitionDocumentStatus({
      actorUserId,
      workspaceId,
      documentId,
      action: "request_changes",
      note,
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

  private validateCreatePayload(raw: CreateDocumentBody) {
    if (!raw || typeof raw !== "object") {
      throw new ValidationAppError({
        message: "Document payload is required.",
        issues: [{ field: "body", rule: "required", message: "Document payload is required." }],
      });
    }

    const title = (raw.title ?? "").toString().trim();
    if (title.length < 3 || title.length > 200) {
      throw new ValidationAppError({
        message: "Title must be 3-200 characters.",
        issues: [
          {
            field: "title",
            rule: "length",
            message: "Title must be 3-200 characters.",
          },
        ],
      });
    }

    const folderId =
      raw.folderId === undefined ? undefined : (raw.folderId ?? "").toString().trim() || null;
    const templateId =
      raw.templateId === undefined ? undefined : (raw.templateId ?? "").toString().trim() || null;

    return {
      title,
      folderId,
      templateId,
    };
  }

  private validateUpdatePayload(raw: UpdateDocumentBody) {
    if (!raw || typeof raw !== "object") {
      throw new ValidationAppError({
        message: "Document payload is required.",
        issues: [{ field: "body", rule: "required", message: "Document payload is required." }],
      });
    }

    const title = raw.title === undefined ? undefined : (raw.title ?? "").toString().trim();
    if (title !== undefined && (title.length < 3 || title.length > 200)) {
      throw new ValidationAppError({
        message: "Title must be 3-200 characters.",
        issues: [
          {
            field: "title",
            rule: "length",
            message: "Title must be 3-200 characters.",
          },
        ],
      });
    }

    const folderId =
      raw.folderId === undefined ? undefined : (raw.folderId ?? "").toString().trim() || null;

    let status: DocumentStatus | undefined;
    if (raw.status !== undefined && raw.status !== null) {
      const nextStatus = raw.status.toString().trim() as DocumentStatus;
      if (!validDocumentStatus.includes(nextStatus)) {
        throw new ValidationAppError({
          message: "Document status is invalid.",
          issues: [
            {
              field: "status",
              rule: "enum",
              message: "Document status is invalid.",
            },
          ],
        });
      }
      status = nextStatus;
    }

    if (title === undefined && folderId === undefined && status === undefined) {
      throw new ValidationAppError({
        message: "At least one updatable field is required.",
        issues: [
          {
            field: "body",
            rule: "required",
            message: "At least one updatable field is required.",
          },
        ],
      });
    }

    return {
      title,
      folderId,
      status,
    };
  }

  private validateContentUpdatePayload(raw: UpdateDocumentContentBody) {
    if (!raw || typeof raw !== "object") {
      throw new ValidationAppError({
        message: "Document content payload is required.",
        issues: [
          { field: "body", rule: "required", message: "Document content payload is required." },
        ],
      });
    }

    const contentPlaintext = (raw.contentPlaintext ?? "").toString().trim();
    if (contentPlaintext.length === 0) {
      throw new ValidationAppError({
        message: "Document content cannot be empty.",
        issues: [
          {
            field: "contentPlaintext",
            rule: "required",
            message: "Document content cannot be empty.",
          },
        ],
      });
    }
    if (contentPlaintext.length > 20_000) {
      throw new ValidationAppError({
        message: "Document content must be 20,000 characters or less.",
        issues: [
          {
            field: "contentPlaintext",
            rule: "length",
            message: "Document content must be 20,000 characters or less.",
          },
        ],
      });
    }

    const yjsStateBase64 =
      raw.yjsStateBase64 === undefined
        ? undefined
        : (raw.yjsStateBase64 ?? "").toString().trim() || undefined;
    const reason = (raw.reason ?? "manual_edit").toString().trim() || "manual_edit";
    if (reason.length > 30) {
      throw new ValidationAppError({
        message: "Version reason must be 30 characters or less.",
        issues: [
          {
            field: "reason",
            rule: "length",
            message: "Version reason must be 30 characters or less.",
          },
        ],
      });
    }

    const blockTypes = Array.isArray(raw.blockTypes)
      ? raw.blockTypes
          .map((entry) => entry?.toString().trim())
          .filter((entry): entry is string => Boolean(entry))
      : undefined;

    return {
      contentPlaintext,
      yjsStateBase64,
      reason,
      blockTypes,
    };
  }

  private validateRequiredNote(raw: TransitionNoteBody) {
    const note = (raw?.note ?? "").toString().trim();
    if (!note) {
      throw new ValidationAppError({
        message: "A review note is required.",
        issues: [
          {
            field: "note",
            rule: "required",
            message: "A review note is required.",
          },
        ],
      });
    }
    if (note.length > 1000) {
      throw new ValidationAppError({
        message: "Review note must be 1000 characters or less.",
        issues: [
          {
            field: "note",
            rule: "length",
            message: "Review note must be 1000 characters or less.",
          },
        ],
      });
    }
    return note;
  }
}
