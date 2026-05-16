import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isDatabaseUuidParam } from "../common/auth/request-user.js";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { toActivityEventListItem } from "./activity-event.mapper.js";

@Injectable()
export class ActivityService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async listWorkspaceActivity(input: {
    actorUserId: string;
    workspaceId: string;
    page: number;
    pageSize: number;
  }) {
    if (!isDatabaseUuidParam(input.workspaceId)) {
      throw new ValidationAppError({
        issues: [
          {
            field: "workspaceId",
            message: "Workspace id must be a UUID.",
            rule: "uuid",
          },
        ],
      });
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.actorUserId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        workspace: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!member) {
      const actor = await this.prisma.user.findFirst({
        where: { id: input.actorUserId, deletedAt: null },
        select: { globalRole: true },
      });
      if (actor?.globalRole !== "ADMIN") {
        throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
      }
      const ws = await this.prisma.workspace.findFirst({
        where: { id: input.workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!ws) {
        throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
      }
    }

    try {
      const [total, items] = await Promise.all([
        this.prisma.activityEvent.count({ where: { workspaceId: input.workspaceId } }),
        this.prisma.activityEvent.findMany({
          where: { workspaceId: input.workspaceId },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
      ]);
      return { items: items.map(toActivityEventListItem), total };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
        throw new AppError({
          code: "INTERNAL_ERROR",
          message:
            "Activity history is unavailable until database migrations are applied (missing activity_events table). Run `pnpm exec prisma migrate deploy` for the target database.",
        });
      }
      throw err;
    }
  }
}
