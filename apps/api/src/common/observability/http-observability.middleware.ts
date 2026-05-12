import type { NextFunction, Request, Response } from "express";
import { Injectable, type NestMiddleware } from "@nestjs/common";

@Injectable()
export class HttpObservabilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
    const route = req.route?.path ?? req.path;
    const method = req.method.toUpperCase();
    const requestId = req.requestId ?? "unknown";

    res.once("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusCode = res.statusCode;
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      const logPayload = {
        event: "api.request.completed",
        level,
        requestId,
        method,
        route,
        statusCode,
        latencyMs: Number(elapsedMs.toFixed(2)),
      };
      const serialized = JSON.stringify(logPayload);
      if (statusCode >= 500) {
        console.error(serialized);
      } else if (statusCode >= 400) {
        console.warn(serialized);
      } else {
        console.info(serialized);
      }
    });

    next();
  }
}
