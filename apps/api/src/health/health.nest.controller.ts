import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthNestController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async getHealth(@ReqRequestId() requestId: string) {
    const result = await this.healthService.runChecks();
    const statusCode = result.status === "healthy" ? 200 : 503;
    return {
      statusCode,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({
          service: "api",
          status: result.status,
          checks: result.checks,
        }),
        requestId,
      }),
    };
  }
}
