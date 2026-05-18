import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  AppError,
  type CanonicalErrorCode,
  createErrorResponse,
  type ErrorEnvelope,
  logApiError,
} from "../filters/app-error.filter.js";
import { getDefaultErrorMessage } from "../errors/error-sanitizer.js";
import { resolveRequestId } from "../middleware/request-id.middleware.js";

const errorCodeFromHttpStatus = (status: number): CanonicalErrorCode => {
  if (status === HttpStatus.NOT_FOUND) {
    return "NOT_FOUND";
  }
  if (status === HttpStatus.FORBIDDEN) {
    return "FORBIDDEN";
  }
  if (status === HttpStatus.UNAUTHORIZED) {
    return "UNAUTHORIZED";
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return "RATE_LIMITED";
  }
  return "INTERNAL_ERROR";
};

const isOurErrorEnvelope = (value: unknown): value is ErrorEnvelope =>
  Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as ErrorEnvelope).error === "object" &&
      (value as ErrorEnvelope).error !== null &&
      "code" in (value as ErrorEnvelope).error,
  );

const isStructuredHttpErrorBody = (
  value: unknown,
): value is {
  code: CanonicalErrorCode;
  message?: string;
  details?: ErrorEnvelope["error"]["details"];
} =>
  Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      typeof (value as { code: unknown }).code === "string",
  );

@Catch()
export class NestAppErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      typeof request.requestId === "string" && request.requestId.length > 0
        ? request.requestId
        : resolveRequestId(request.get("x-request-id"));

    if (response.headersSent) {
      return;
    }

    if (exception instanceof AppError) {
      const mapped = createErrorResponse({ error: exception, requestId });
      logApiError({ requestId, normalizedError: mapped.normalizedError });
      if (mapped.headers) {
        for (const [k, v] of Object.entries(mapped.headers)) {
          response.setHeader(k, v);
        }
      }
      response.status(mapped.statusCode).json(mapped.payload);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (isOurErrorEnvelope(body)) {
        const envelope: ErrorEnvelope = {
          error: {
            ...body.error,
            requestId,
            timestamp: body.error.timestamp ?? new Date().toISOString(),
          },
        };
        response.status(status).json(envelope);
        return;
      }

      if (isStructuredHttpErrorBody(body)) {
        const mapped = createErrorResponse({
          error: new AppError({
            code: body.code,
            message: body.message ?? getDefaultErrorMessage(body.code),
            details: body.details,
            statusCode: status,
          }),
          requestId,
        });
        logApiError({ requestId, normalizedError: mapped.normalizedError });
        response.status(mapped.statusCode).json(mapped.payload);
        return;
      }

      if (exception instanceof BadRequestException && typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        const message = b.message;
        const issues =
          Array.isArray(message) && message.every((m) => typeof m === "string")
            ? message.map((m) => ({
                field: "body",
                message: m,
                rule: "validation",
              }))
            : [
                {
                  field: "body",
                  message: typeof message === "string" ? message : "Validation failed",
                  rule: "validation",
                },
              ];

        const mapped = createErrorResponse({
          error: new AppError({
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: issues.map((issue) => ({
              field: issue.field,
              message: issue.message,
              rule: issue.rule,
            })),
          }),
          requestId,
        });
        logApiError({ requestId, normalizedError: mapped.normalizedError });
        response.status(mapped.statusCode).json(mapped.payload);
        return;
      }

      const code = errorCodeFromHttpStatus(status);
      const message =
        code === "NOT_FOUND"
          ? getDefaultErrorMessage("NOT_FOUND")
          : typeof body === "string"
            ? body
            : typeof body === "object" && body !== null && "message" in body
              ? String((body as { message: unknown }).message)
              : exception.message;

      const mapped = createErrorResponse({
        error: new AppError({
          code,
          message,
          statusCode: status,
        }),
        requestId,
      });
      logApiError({ requestId, normalizedError: mapped.normalizedError });
      response.status(status).json(mapped.payload);
      return;
    }

    const mapped = createErrorResponse({ error: exception, requestId });
    logApiError({ requestId, normalizedError: mapped.normalizedError });
    response.status(mapped.statusCode).json(mapped.payload);
  }
}
