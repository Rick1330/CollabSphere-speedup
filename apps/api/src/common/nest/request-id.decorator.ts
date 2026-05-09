import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { createRequestId } from "../middleware/request-id.middleware.js";

export const ReqRequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.requestId ?? createRequestId();
});
