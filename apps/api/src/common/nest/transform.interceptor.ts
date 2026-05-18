import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { map, type Observable } from "rxjs";

const isEnvelopedResponse = (value: unknown): boolean =>
  Boolean(
    value &&
      typeof value === "object" &&
      ("data" in value || "error" in value),
  );

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      typeof request.requestId === "string" && request.requestId.length > 0
        ? request.requestId
        : "unknown";

    return next.handle().pipe(
      map((data: unknown) => {
        if (isEnvelopedResponse(data)) {
          return data;
        }

        return {
          data,
          meta: {
            requestId,
          },
        };
      }),
    );
  }
}
