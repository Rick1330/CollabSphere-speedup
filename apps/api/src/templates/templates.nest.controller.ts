import { Controller, Get, Inject, Param } from "@nestjs/common";
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
  async list(@ReqRequestId() requestId: string) {
    const { items, total } = await this.templatesService.listSystemTemplates();
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
