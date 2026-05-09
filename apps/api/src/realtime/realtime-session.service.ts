import { Injectable } from "@nestjs/common";
import type { Socket } from "socket.io";
import { JwtAccessService } from "../auth/jwt-access.service.js";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import type { RealtimeAuthUser } from "./realtime.types.js";

@Injectable()
export class RealtimeSessionService {
  constructor(
    private readonly jwtAccessService: JwtAccessService,
    private readonly prisma: PrismaClientProvider,
  ) {}

  async authenticateSocket(client: Socket): Promise<RealtimeAuthUser> {
    const token = this.resolveAccessToken(client);
    const payload = await this.jwtAccessService.verifyAccessToken(token);
    return {
      userId: payload.sub,
      email: payload.email,
      globalRole: payload.globalRole,
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

  toWorkspaceRoom(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  toUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  toTaskRoom(taskId: string): string {
    return `task:${taskId}`;
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
