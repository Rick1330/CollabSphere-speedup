import { Inject, Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class SearchService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async searchWorkspace(input: { actorUserId: string; workspaceId: string; query: string; limit: number }) {
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
    const q = input.query.trim();
    if (!q) {
      return { documents: [], tasks: [] };
    }
    const [documents, tasks] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          workspaceId: input.workspaceId,
          deletedAt: null,
          OR: [{ title: { contains: q, mode: "insensitive" } }, { contentPlaintext: { contains: q, mode: "insensitive" } }],
        },
        select: { id: true, title: true, status: true, updatedAt: true },
        take: input.limit,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.task.findMany({
        where: {
          workspaceId: input.workspaceId,
          deletedAt: null,
          OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
        },
        select: { id: true, title: true, status: true, priority: true, updatedAt: true },
        take: input.limit,
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return { documents, tasks };
  }
}
