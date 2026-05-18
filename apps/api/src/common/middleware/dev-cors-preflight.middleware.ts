import type { NextFunction, Request, Response } from "express";
import {
  applyCorsResponseHeaders,
  parseCorsOrigins,
  resolveCorsAllowOrigin,
} from "../cors/cors-origins.util.js";

export function devCorsPreflightMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== "OPTIONS") {
    next();
    return;
  }

  const allowed = parseCorsOrigins(process.env.CORS_ORIGINS);
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowOrigin = resolveCorsAllowOrigin(requestOrigin, allowed);
  applyCorsResponseHeaders(res, allowOrigin, { includeMethodsAndHeaders: true });
  res.status(204).end();
}
