import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { createReadStream } from "node:fs";
import type { Response } from "express";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from "class-validator";
import type { ExportPageSetup } from "@collabsphere/shared/jobs";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { ExportsService } from "./exports.service.js";

class ExportMarginsDto {
  @IsNumber()
  top!: number;

  @IsNumber()
  right!: number;

  @IsNumber()
  bottom!: number;

  @IsNumber()
  left!: number;
}

class ExportPageSetupDto {
  @IsEnum(["letter", "a4", "legal"])
  format!: ExportPageSetup["format"];

  @IsEnum(["portrait", "landscape"])
  orientation!: ExportPageSetup["orientation"];

  @ValidateNested()
  @Type(() => ExportMarginsDto)
  margins!: ExportMarginsDto;
}

class CreateExportBodyDto {
  @IsUUID()
  resourceId!: string;

  @IsEnum(["pdf", "markdown"])
  format!: "pdf" | "markdown";

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExportPageSetupDto)
  pageSetup?: ExportPageSetupDto;
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
      pageSetup: body.pageSetup,
    });
    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ exportJob: job }),
        requestId,
      }),
    };
  }

  @Post("workspaces/:workspaceId/documents/:documentId/export")
  async createDocumentExport(
    @Param("workspaceId") workspaceId: string,
    @Param("documentId") documentId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: Pick<CreateExportBodyDto, "format" | "pageSetup">,
  ) {
    const job = await this.exportsService.createExport({
      actorUserId,
      workspaceId,
      resourceId: documentId,
      format: body?.format ?? "pdf",
      pageSetup: body?.pageSetup,
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

  @Get("exports/:exportJobId/download")
  async download(
    @Param("exportJobId") exportJobId: string,
    @CurrentUserId() actorUserId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.exportsService.resolveExportDownloadPath(exportJobId, actorUserId);
    const filename = filePath.endsWith(".pdf") ? "document.pdf" : "document.md";
    res.setHeader("Content-Type", filePath.endsWith(".pdf") ? "application/pdf" : "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return new StreamableFile(createReadStream(filePath));
  }
}
