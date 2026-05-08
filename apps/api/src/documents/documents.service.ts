import { Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { parseDocumentTemplateContent } from "../common/templates/template-schema.js";

const collectTextFromNode = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFromNode(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      collectTextFromNode(entry),
    );
  }

  return [];
};

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaClientProvider) {}

  async createDocument({
    actorUserId,
    workspaceId,
    title,
    folderId,
    templateId,
  }: {
    actorUserId: string;
    workspaceId: string;
    title: string;
    folderId?: string | null;
    templateId?: string | null;
  }) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorUserId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
      select: {
        id: true,
        workspace: { select: { id: true, type: true, status: true } },
      },
    });

    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }

    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    if (folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: folderId,
          workspaceId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!folder) {
        throw new AppError({ code: "FOLDER_NOT_FOUND" });
      }
    }

    const template = templateId
      ? await this.prisma.template.findFirst({
          where: {
            id: templateId,
            isEnabled: true,
          },
          select: {
            id: true,
            kind: true,
            category: true,
            version: true,
            schemaVersion: true,
            content: true,
          },
        })
      : null;

    if (templateId && !template) {
      throw new AppError({ code: "TEMPLATE_NOT_FOUND" });
    }

    if (template && template.kind !== "document") {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }

    if (template && template.category !== membership.workspace.type) {
      throw new AppError({ code: "TEMPLATE_CATEGORY_MISMATCH" });
    }

    const parsedTemplate = template ? parseDocumentTemplateContent(template.content) : null;
    const plaintext = parsedTemplate
      ? collectTextFromNode(parsedTemplate.blocks).join(" ").slice(0, 20_000)
      : "";
    const templateProperties = parsedTemplate
      ? {
          template: {
            id: template.id,
            version: template.version,
            schemaVersion: template.schemaVersion,
            format: parsedTemplate.format ?? null,
            metadata: parsedTemplate.metadata ?? null,
            properties: parsedTemplate.properties ?? null,
          },
          blocks: parsedTemplate.blocks,
        }
      : null;

    const maxPosition = await this.prisma.document.findFirst({
      where: {
        workspaceId,
        folderId: folderId ?? null,
        deletedAt: null,
      },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = maxPosition ? Number(maxPosition.position) + 1 : 1;

    const created = await this.prisma.document.create({
      data: {
        workspaceId,
        folderId: folderId ?? null,
        title,
        position: nextPosition,
        contentPlaintext: plaintext,
        properties: templateProperties ?? undefined,
        templateId: template?.id ?? null,
        templateVersion: template?.version ?? null,
        createdById: actorUserId,
      },
      select: {
        id: true,
        workspaceId: true,
        folderId: true,
        title: true,
        status: true,
        templateId: true,
        templateVersion: true,
        createdAt: true,
      },
    });

    return created;
  }
}
