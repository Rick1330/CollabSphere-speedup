import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsInt, IsString, Max, Min } from "class-validator";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import { createSingleResourcePayload, wrapSuccessResponse } from "../common/interceptors/response-envelope.interceptor.js";
import { SearchService } from "./search.service.js";

class SearchQueryDto {
  @IsString()
  q = "";

  @Transform(({ value }) => Number(value ?? 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

@Controller("workspaces/:workspaceId/search")
export class SearchNestController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: SearchQueryDto,
  ) {
    const resource = await this.searchService.searchWorkspace({
      actorUserId,
      workspaceId,
      query: query.q,
      limit: query.limit,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(resource),
      requestId,
    });
  }
}
