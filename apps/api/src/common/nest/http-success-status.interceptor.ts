import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { map, type Observable } from "rxjs";

type BodyWithStatus = { statusCode: number; [key: string]: unknown };

const hasNumericStatusCode = (body: unknown): body is BodyWithStatus =>
  Boolean(
    body &&
      typeof body === "object" &&
      "statusCode" in body &&
      typeof (body as BodyWithStatus).statusCode === "number",
  );

@Injectable()
export class HttpSuccessStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (!hasNumericStatusCode(body)) {
          return body;
        }
        const { statusCode, ...rest } = body;
        response.status(statusCode);
        return rest;
      }),
    );
  }
}
