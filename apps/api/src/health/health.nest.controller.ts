import { Controller, Get } from "@nestjs/common";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthNestController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
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
        requestId: "nest-request",
      }),
    };
  }
}
