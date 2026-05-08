import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { resolveRequestUserId } from "../common/auth/request-user.js";
import { ValidationAppError } from "../common/filters/app-error.filter.js";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { DocumentsService } from "./documents.service.js";

type CreateDocumentBody = {
  title: string;
  folderId?: string | null;
  templateId?: string | null;
};

@Controller("workspaces/:workspaceId/documents")
export class DocumentsNestController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async createDocument(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: CreateDocumentBody,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
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
        requestId: "nest-request",
      }),
    };
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
}
