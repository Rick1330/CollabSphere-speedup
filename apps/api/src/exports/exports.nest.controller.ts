import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { IsEnum, IsUUID } from "class-validator";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import { createSingleResourcePayload, wrapSuccessResponse } from "../common/interceptors/response-envelope.interceptor.js";
import { ExportsService } from "./exports.service.js";

class CreateExportBodyDto {
  @IsUUID()
  resourceId!: string;

  @IsEnum(["pdf", "markdown"])
  format!: "pdf" | "markdown";
}

@Controller()
export class ExportsNestController {
  constructor(@Inject(ExportsService) private readonly exportsService: ExportsService) {}

  @Post("workspaces/:workspaceId/exports")
  async create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: CreateExportBodyDto,
  ) {
    const job = await this.exportsService.createExport({
      actorUserId,
      workspaceId,
      resourceId: body.resourceId,
      format: body.format,
    });
    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ exportJob: job }),
        requestId,
      }),
    };
  }

  @Get("exports/:exportJobId")
  async get(
    @Param("exportJobId") exportJobId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
  ) {
    const job = await this.exportsService.getExport({ actorUserId, exportJobId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ exportJob: job }),
      requestId,
    });
  }
}
