import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import { createListResponsePayload, wrapSuccessResponse } from "../common/interceptors/response-envelope.interceptor.js";
import { ActivityService } from "./activity.service.js";

class ListActivityQueryDto {
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

const paginationMeta = (page: number, pageSize: number, totalItems: number) => ({
  page,
  pageSize,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  hasPreviousPage: page > 1,
  hasNextPage: page * pageSize < totalItems,
});

@Controller("workspaces/:workspaceId/activity")
export class ActivityNestController {
  constructor(@Inject(ActivityService) private readonly activityService: ActivityService) {}

  @Get()
  async list(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: ListActivityQueryDto,
  ) {
    const result = await this.activityService.listWorkspaceActivity({
      actorUserId,
      workspaceId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({
        items: result.items,
        total: result.total,
        pagination: {
          ...paginationMeta(query.page, query.pageSize, result.total),
        },
      }),
      requestId,
    });
  }
}
