import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { TemplatesService } from "./templates.service.js";

@Controller("templates")
export class TemplatesNestController {
  constructor(@Inject(TemplatesService) private readonly templatesService: TemplatesService) {}

  @Get()
  async list(
    @ReqRequestId() requestId: string,
    @Query("kind") kind?: string,
    @Query("category") category?: string,
    @Query("schemaVersion") schemaVersionRaw?: string,
  ) {
    const parsed =
      schemaVersionRaw !== undefined && schemaVersionRaw.trim().length > 0
        ? Number.parseInt(schemaVersionRaw, 10)
        : undefined;
    const schemaVersion = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
    const { items, total } = await this.templatesService.listSystemTemplates({
      kind: kind?.trim() || undefined,
      category: category?.trim() || undefined,
      schemaVersion,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items, total }),
      requestId,
    });
  }

  @Get(":id")
  async getById(@Param("id") id: string, @ReqRequestId() requestId: string) {
    const data = await this.templatesService.getById(id);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }
}
