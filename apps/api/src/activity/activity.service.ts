import { Inject, Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class ActivityService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async listWorkspaceActivity(input: {
    actorUserId: string;
    workspaceId: string;
    page: number;
    pageSize: number;
  }) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.actorUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
    const [total, items] = await Promise.all([
      this.prisma.activityEvent.count({ where: { workspaceId: input.workspaceId } }),
      this.prisma.activityEvent.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);
    return { items, total };
  }
}
