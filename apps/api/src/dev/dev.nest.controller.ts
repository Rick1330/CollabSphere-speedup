import { Controller, Get } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";

let nestAppRef: INestApplication | null = null;

export function setDevNestAppRef(app: INestApplication | null) {
  nestAppRef = app;
}

@Controller("dev")
export class DevNestController {
  @Public()
  @Get("routes")
  listRoutes(@ReqRequestId() requestId: string) {
    if ((process.env.NODE_ENV ?? "development") === "production") {
      return wrapSuccessResponse({
        payload: createSingleResourcePayload({ routes: [], note: "Disabled in production." }),
        requestId,
      });
    }

    const server = nestAppRef?.getHttpServer();
    const stack = server?._events?.request?._router?.stack ?? [];
    const routes: string[] = [];

    for (const layer of stack) {
      if (!layer?.route?.path) continue;
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      for (const method of methods) {
        routes.push(`${method} /api/v1${layer.route.path}`);
      }
    }

    const critical = routes.filter(
      (r) =>
        r.includes(" workspaces") ||
        r.includes("/workspaces/") ||
        r.includes(" health"),
    );

    return wrapSuccessResponse({
      payload: createSingleResourcePayload({
        total: routes.length,
        critical,
        routes: routes.sort(),
      }),
      requestId,
    });
  }
}
