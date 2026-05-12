import { Inject, Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class TemplatesService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async listSystemTemplates() {
    const items = await this.prisma.template.findMany({
      where: {
        scope: "system",
        isEnabled: true,
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: {
        id: true,
        kind: true,
        category: true,
        name: true,
        description: true,
        version: true,
        schemaVersion: true,
        contentFormat: true,
      },
    });
    return { items, total: items.length };
  }

  async getById(id: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        scope: "system",
        isEnabled: true,
      },
    });
    if (!template) {
      throw new AppError({ code: "TEMPLATE_NOT_FOUND", message: "Template not found" });
    }
    return { template };
  }
}
