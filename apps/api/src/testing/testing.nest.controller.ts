import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { createPaginatedListPayload } from "../common/interceptors/pagination.interceptor.js";
import { parsePaginationParams, slicePageItems } from "../common/pagination/pagination.js";

const paginationFixtureItems = Array.from({ length: 53 }, (_, index) => ({
  id: `fixture_${String(index + 1).padStart(3, "0")}`,
  name: `Fixture Item ${index + 1}`,
}));

@Controller("pagination")
export class TestingNestController {
  @Public()
  @Get("fixtures")
  async getPaginationFixtures(
    @ReqRequestId() requestId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const pagination = parsePaginationParams({
      page,
      pageSize,
    });
    const pagedItems = slicePageItems(paginationFixtureItems, pagination);

    return wrapSuccessResponse({
      payload: createPaginatedListPayload({
        items: pagedItems,
        totalItems: paginationFixtureItems.length,
        pagination,
      }),
      requestId,
    });
  }
}
