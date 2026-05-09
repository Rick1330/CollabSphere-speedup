import type { NextFunction, Request, Response } from "express";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import { createRequestId, resolveRequestId } from "../middleware/request-id.middleware.js";

@Injectable()
export class NestRequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerValue = req.header("x-request-id");
    const requestId = resolveRequestId(headerValue);
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  }
}

/** For tests when middleware is bypassed */
export const assignFallbackRequestId = (req: Request) => {
  if (!req.requestId) {
    req.requestId = createRequestId();
  }
};
