import type { NextFunction, Request, Response } from "express";
import { applyCorsResponseHeaders, parseCorsOrigins, resolveCorsAllowOrigin } from "../cors/cors-origins.util.js";

export function corsResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowed = parseCorsOrigins(process.env.CORS_ORIGINS);
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowOrigin = resolveCorsAllowOrigin(requestOrigin, allowed);
  applyCorsResponseHeaders(res, allowOrigin);
  next();
}
