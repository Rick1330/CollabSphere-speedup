import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentWorkspace = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.workspace) {
    throw new Error("CurrentWorkspace used without WorkspaceMembershipGuard context");
  }
  return request.workspace;
});

export const CurrentWorkspaceMember = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.workspaceMember) {
    throw new Error("CurrentWorkspaceMember used without WorkspaceMembershipGuard context");
  }
  return request.workspaceMember;
});
