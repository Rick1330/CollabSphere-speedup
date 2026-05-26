import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Socket } from "socket.io";
import { JwtAccessService } from "../auth/jwt-access.service.js";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import type { RealtimeAuthUser } from "./realtime.types.js";

@Injectable()
export class RealtimeSessionService {
  private readonly logger = new Logger(RealtimeSessionService.name);

  constructor(
    @Inject(JwtAccessService) private readonly jwtAccessService: JwtAccessService,
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
  ) {}

  async authenticateSocket(client: Socket): Promise<RealtimeAuthUser> {
    const token = this.resolveAccessToken(client);
    if (!this.jwtAccessService?.verifyAccessToken) {
      this.logger.error(
        "JwtAccessService is not injected on RealtimeSessionService (Nest WebSocket DI / duplicate ESM class)",
      );
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Realtime auth is not configured",
      });
    }
    const payload = await this.jwtAccessService.verifyAccessToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        globalRole: true,
      },
    });
    if (!user) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "User inactive or not found",
      });
    }
    return {
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
    };
  }

  getAuthenticatedUser(client: Socket): RealtimeAuthUser {
    const user = client.data.user as RealtimeAuthUser | undefined;
    if (!user?.userId) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Socket user is not authenticated",
      });
    }
    return user;
  }

  async assertWorkspaceMembership(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
        deletedAt: null,
        workspace: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
      },
    });
    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
  }

  async assertTaskInWorkspace(userId: string, workspaceId: string, taskId: string): Promise<void> {
    await this.assertWorkspaceMembership(userId, workspaceId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      throw new AppError({ code: "NOT_FOUND", message: "Task not found in workspace" });
    }
  }

  async assertDocumentInWorkspace(
    userId: string,
    workspaceId: string,
    documentId: string,
  ): Promise<void> {
    await this.assertWorkspaceMembership(userId, workspaceId);
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!document) {
      throw new AppError({ code: "NOT_FOUND", message: "Document not found in workspace" });
    }
  }

  async resolveTaskWorkspaceId(taskId: string): Promise<string | null> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { workspaceId: true },
    });
    return task?.workspaceId ?? null;
  }

  toWorkspaceRoom(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  toUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  toTaskRoom(taskId: string): string {
    return `task:${taskId}`;
  }

  toDocumentRoom(documentId: string): string {
    return `document:${documentId}`;
  }

  private resolveAccessToken(client: Socket): string {
    const authToken =
      typeof client.handshake.auth?.token === "string" ? client.handshake.auth.token.trim() : "";
    if (authToken) {
      return authToken;
    }

    const headerValue = client.handshake.headers.authorization;
    const bearer =
      typeof headerValue === "string" && headerValue.toLowerCase().startsWith("bearer ")
        ? headerValue.slice(7).trim()
        : "";

    if (!bearer) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Missing realtime access token",
      });
    }
    return bearer;
  }
}
