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
      this.prisma.$queryRaw<any[]>`
        SELECT id, title, status, updated_at as "updatedAt"
        FROM documents
        WHERE workspace_id = ${input.workspaceId}::uuid
          AND deleted_at IS NULL
          AND (
            search_vector @@ websearch_to_tsquery('english', ${q})
            OR title ILIKE ${`%${q}%`}
          )
        ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${q})) DESC, updated_at DESC
        LIMIT ${input.limit}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT id, title, status, priority, updated_at as "updatedAt"
        FROM tasks
        WHERE workspace_id = ${input.workspaceId}::uuid
          AND deleted_at IS NULL
          AND (
            search_vector @@ websearch_to_tsquery('english', ${q})
            OR title ILIKE ${`%${q}%`}
          )
        ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${q})) DESC, updated_at DESC
        LIMIT ${input.limit}
      `,
    ]);
    return { documents, tasks };
  }
}
