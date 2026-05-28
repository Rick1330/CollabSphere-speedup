import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { WorkspaceMembershipGuard } from "../common/guards/workspace-membership.guard.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { DocumentsService } from "./documents.service.js";

@Controller("workspaces/:workspaceId/submissions")
@UseGuards(WorkspaceMembershipGuard)
export class DocumentSubmissionsNestController {
  constructor(@Inject(DocumentsService) private readonly documentsService: DocumentsService) {}

  @Get("queue")
  async getQueue(
    @Param("workspaceId") workspaceId: string,
    @ReqRequestId() requestId: string,
    @CurrentUserId() actorUserId: string,
  ) {
    const { items, total } = await this.documentsService.getSubmissionQueue({
      actorUserId,
      workspaceId,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total }),
      requestId,
    });
  }

  @Get("health")
  async health(@ReqRequestId() requestId: string) {
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ ok: true }),
      requestId,
    });
  }
}

