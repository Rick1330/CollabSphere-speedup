import type { DocumentStatus, Prisma, WorkspaceRole } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { parseDocumentTemplateContent } from "../common/templates/template-schema.js";
import { canManageLocks, isDocumentReadOnly } from "../../../../packages/shared/src/collab/document-write-policy.js";
import {
  canCreateWorkspaceContent,
  canOrganizeWorkspaceContent,
} from "../../../../packages/shared/src/collab/workspace-content-policy.js";

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


const toPrismaBytes = (data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Uint8Array(buffer);
};
const reviewAllowedRoles = new Set(["OWNER", "ADMIN", "MANAGER"]);
const assertManagerOrAbove = (role: WorkspaceRole) => {
  if (!canManageLocks(role)) {
    throw new AppError({
      code: "INSUFFICIENT_ROLE",
      message: "Manager role or higher is required.",
    });
  }
};

const parseRequiredBlockTypesFromProperties = (value: unknown): Set<string> => {
  if (!value || typeof value !== "object") {
    return new Set();
  }

  const template = (value as Record<string, unknown>).template;
  if (!template || typeof template !== "object") {
    return new Set();
  }

  const properties = (template as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object") {
    return new Set();
  }

  const enforcement = (properties as Record<string, unknown>).enforcement;
  if (!enforcement || typeof enforcement !== "object") {
    return new Set();
  }

  const required = (enforcement as Record<string, unknown>).requiredBlockTypes;
  if (!Array.isArray(required)) {
    return new Set();
  }

  return new Set(
    required
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0),
  );
};

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listDocumentsForUser({
    actorUserId,
    workspaceId,
    folderId,
  }: {
    actorUserId: string;
    workspaceId: string;
    folderId?: string | null;
  }) {
    await this.requireWorkspaceMembership({ actorUserId, workspaceId });

    const documents = await this.prisma.document.findMany({
      where: {
        workspaceId,
        folderId: folderId === undefined ? undefined : folderId,
        deletedAt: null,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        folderId: true,
        title: true,
        status: true,
        templateId: true,
        templateVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return documents;
  }

  async getDocumentByIdForUser({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    await this.requireWorkspaceMembership({ actorUserId, workspaceId });

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        folderId: true,
        title: true,
        status: true,
        templateId: true,
        templateVersion: true,
        properties: true,
        createdAt: true,
        updatedAt: true,
        isLocked: true,
        lockedByUser: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        folder: { select: { name: true } },
      },
    });

    if (!document) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    return document;
  }

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
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    if (!canCreateWorkspaceContent(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE", message: "Member role or higher is required." });
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
            contentFormat: true,
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

    let parsedTemplate: ReturnType<typeof parseDocumentTemplateContent> | null = null;
    if (template) {
      try {
        parsedTemplate = parseDocumentTemplateContent(template.content);
      } catch {
        throw new AppError({
          code: "TEMPLATE_INVALID",
          message: "Template content could not be parsed.",
        });
      }
    }
    const plaintext = parsedTemplate
      ? collectTextFromNode(parsedTemplate.blocks).join(" ").slice(0, 20_000)
      : "";
    const templateProperties =
      parsedTemplate && template
        ? {
            template: {
              id: template.id,
              version: template.version,
              schemaVersion: template.schemaVersion,
              format: parsedTemplate.format ?? template.contentFormat ?? null,
              metadata: parsedTemplate.metadata ?? null,
              properties: parsedTemplate.properties ?? null,
            },
            blocks: parsedTemplate.blocks,
            ...(parsedTemplate.regions ? { regions: parsedTemplate.regions } : {}),
            ...(parsedTemplate.variables ? { variables: parsedTemplate.variables } : {}),
          }
        : null;

    const isRichDocument = parsedTemplate?.format === "richdocument";
    // T1: Yjs binary (`contentYjs`) stays at the DB default (empty) until a collab-layer
    // `YjsService.seedFromV2Template` (or equivalent) exists; metadata, regions, variables,
    // and plaintext snapshot are persisted here for API/DB workflows.
    const regionOrderJson: Prisma.InputJsonValue | undefined =
      isRichDocument && parsedTemplate?.regions && parsedTemplate.regions.length > 0
        ? (JSON.parse(JSON.stringify(parsedTemplate.regions.map((r) => r.id))) as Prisma.InputJsonValue)
        : undefined;
    const templateSchemaVersion =
      isRichDocument && template ? template.schemaVersion : undefined;

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

    const created = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          workspaceId,
          folderId: folderId ?? null,
          title,
          position: nextPosition,
          contentPlaintext: plaintext,
          properties: templateProperties
            ? (JSON.parse(JSON.stringify(templateProperties)) as Prisma.InputJsonValue)
            : undefined,
          templateId: template?.id ?? null,
          templateVersion: template?.version ?? null,
          templateSchemaVersion: templateSchemaVersion ?? null,
          regionOrder: regionOrderJson ?? undefined,
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
          templateSchemaVersion: true,
          regionOrder: true,
          createdAt: true,
        },
      });

      if (parsedTemplate?.variables?.length) {
        await tx.documentRegionVariable.createMany({
          data: parsedTemplate.variables.map((v) => ({
            documentId: doc.id,
            workspaceId,
            variableKey: v.key,
            value: null,
          })),
        });
      }

      return doc;
    });

    this.eventEmitter.emit("document.created", {
      workspaceId,
      documentId: created.id,
      folderId: created.folderId,
      title: created.title,
    });

    return created;
  }

  async patchDocumentVariables({
    actorUserId,
    workspaceId,
    documentId,
    variables,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
    variables: { variableKey: string; value: string | null | undefined }[];
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    let variableWriteCount = 0;
    for (const v of variables) {
      const key = v.variableKey.trim();
      if (!key.length) {
        continue;
      }
      variableWriteCount += 1;
      await this.prisma.documentRegionVariable.upsert({
        where: {
          documentId_variableKey: {
            documentId: existing.id,
            variableKey: key,
          },
        },
        create: {
          documentId: existing.id,
          workspaceId,
          variableKey: key,
          value: v.value ?? null,
        },
        update: { value: v.value ?? null },
      });
    }

    if (variableWriteCount > 0) {
      this.eventEmitter.emit("document.updated", {
        workspaceId,
        actorId: actorUserId,
        documentId: existing.id,
      });
    }

    return { updated: variables.length };
  }

  async updateDocumentMetadata({
    actorUserId,
    workspaceId,
    documentId,
    title,
    folderId,
    status,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
    title?: string;
    folderId?: string | null;
    status?: DocumentStatus;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    if (!canOrganizeWorkspaceContent(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE", message: "Member role or higher is required." });
    }

    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    if (folderId !== undefined && folderId !== null) {
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

    const updated = await this.prisma.document.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(folderId !== undefined ? { folderId } : {}),
        ...(status !== undefined ? { status } : {}),
        updatedById: actorUserId,
      },
      select: {
        id: true,
        workspaceId: true,
        folderId: true,
        title: true,
        status: true,
        templateId: true,
        templateVersion: true,
        updatedAt: true,
      },
    });

    this.eventEmitter.emit("document.updated", {
      workspaceId,
      actorId: actorUserId,
      documentId: updated.id,
    });
    if (status !== undefined && existing.status !== updated.status) {
      this.eventEmitter.emit("document.status_changed", {
        workspaceId,
        documentId: updated.id,
        fromStatus: existing.status,
        toStatus: updated.status,
      });
    }

    return updated;
  }

  async updateDocumentContent({
    actorUserId,
    workspaceId,
    documentId,
    contentPlaintext,
    yjsStateBase64,
    reason,
    blockTypes,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
    contentPlaintext: string;
    yjsStateBase64?: string;
    reason: string;
    blockTypes?: string[];
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const existing = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        status: true,
        isLocked: true,
        properties: true,
        contentYjs: true,
      },
    });

    if (!existing) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    if (
      isDocumentReadOnly({
        status: existing.status,
        isLocked: Boolean(existing.isLocked),
        role: membership.role,
      })
    ) {
      throw new AppError({ code: "DOCUMENT_READONLY_STATUS" });
    }

    const requiredBlockTypes = parseRequiredBlockTypesFromProperties(existing.properties);
    if (requiredBlockTypes.size > 0) {
      const providedBlockTypes = new Set((blockTypes ?? []).map((entry) => entry.trim()).filter(Boolean));
      const missing = [...requiredBlockTypes].filter((required) => !providedBlockTypes.has(required));
      if (missing.length > 0) {
        throw new ValidationAppError({
          message: "Template required sections are missing.",
          issues: [
            {
              field: "blockTypes",
              rule: "required",
              message: `Missing required blocks: ${missing.join(", ")}`,
            },
          ],
        });
      }
    }

    let yjsStateBuffer: Uint8Array = existing.contentYjs
      ? new Uint8Array(existing.contentYjs)
      : new Uint8Array(0);
    if (yjsStateBase64 !== undefined) {
      try {
        yjsStateBuffer = Buffer.from(yjsStateBase64, "base64");
      } catch {
        throw new ValidationAppError({
          message: "yjsStateBase64 is invalid.",
          issues: [
            {
              field: "yjsStateBase64",
              rule: "format",
              message: "yjsStateBase64 is invalid.",
            },
          ],
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const latestVersion = await tx.documentVersion.findFirst({
        where: {
          documentId: existing.id,
        },
        orderBy: {
          versionNumber: "desc",
        },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      const updatedDocument = await tx.document.update({
        where: {
          id: existing.id,
        },
        data: {
          contentPlaintext,
          contentYjs: toPrismaBytes(yjsStateBuffer),
          updatedById: actorUserId,
        },
        select: {
          id: true,
          workspaceId: true,
          title: true,
          status: true,
          templateId: true,
          templateVersion: true,
          updatedAt: true,
        },
      });

      const createdVersion = await tx.documentVersion.create({
        data: {
          workspaceId,
          documentId: existing.id,
          versionNumber: nextVersionNumber,
          reason,
          yjsState: toPrismaBytes(yjsStateBuffer),
          plaintext: contentPlaintext,
          createdById: actorUserId,
        },
        select: {
          id: true,
          versionNumber: true,
          reason: true,
          createdAt: true,
        },
      });

      return {
        document: updatedDocument,
        version: createdVersion,
      };
    });

    this.eventEmitter.emit("document.updated", {
      workspaceId,
      actorId: actorUserId,
      documentId: result.document.id,
    });

    return result;
  }

  async transitionDocumentStatus({
    actorUserId,
    workspaceId,
    documentId,
    action,
    note,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
    action: "submit" | "request_changes" | "approve";
    note?: string;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        contentPlaintext: true,
      },
    });
    if (!document) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    if (action === "submit") {
      if (!(document.status === "draft" || document.status === "changes_requested")) {
        throw new AppError({ code: "INVALID_TRANSITION" });
      }
      if (document.contentPlaintext.trim().length === 0) {
        throw new AppError({ code: "DOCUMENT_EMPTY" });
      }
      if (membership.workspace.type === "academic" && membership.role === "MEMBER") {
        const reviewerCount = await this.prisma.workspaceMember.count({
          where: {
            workspaceId,
            isActive: true,
            deletedAt: null,
            role: {
              in: ["OWNER", "ADMIN", "MANAGER"],
            },
            userId: {
              not: actorUserId,
            },
          },
        });
        if (reviewerCount === 0) {
          throw new AppError({ code: "NO_SUPERVISOR_ASSIGNED" });
        }
      }
    } else {
      if (membership.workspace.type !== "academic") {
        throw new AppError({ code: "WORKSPACE_NOT_ACADEMIC" });
      }
      if (!reviewAllowedRoles.has(membership.role)) {
        throw new AppError({ code: "INSUFFICIENT_ROLE" });
      }
      if (document.status !== "submitted") {
        throw new AppError({ code: "INVALID_TRANSITION" });
      }
      if (action === "request_changes" && !note?.trim()) {
        throw new AppError({ code: "NOTE_REQUIRED" });
      }
    }

    const nextStatus: DocumentStatus =
      action === "submit" ? "submitted" : action === "approve" ? "approved" : "changes_requested";
    const actorProfile = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        email: true,
        globalRole: true,
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const latestVersion = await tx.documentVersion.findFirst({
        where: {
          documentId,
        },
        orderBy: {
          versionNumber: "desc",
        },
        select: { id: true, versionNumber: true, yjsState: true, plaintext: true },
      });
      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      let snapshotVersionId = latestVersion?.id ?? null;
      if (action === "submit" || action === "approve") {
        const reason = action === "submit" ? "submitted" : "approved";
        const snapshot = await tx.documentVersion.create({
          data: {
            workspaceId,
            documentId,
            versionNumber: nextVersionNumber,
            reason,
            yjsState: latestVersion?.yjsState ?? Buffer.alloc(0),
            plaintext: latestVersion?.plaintext ?? document.contentPlaintext,
            createdById: actorUserId,
          },
          select: { id: true },
        });
        snapshotVersionId = snapshot.id;
      }

      const transitioned = await tx.document.update({
        where: {
          id: documentId,
        },
        data: {
          status: nextStatus,
          updatedById: actorUserId,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      const submission =
        action === "submit"
          ? await tx.documentSubmission.create({
              data: {
                workspaceId,
                documentId,
                submittedById: actorUserId,
                snapshotVersionId,
                decision: null,
                decidedById: null,
                decidedAt: null,
                decisionNote: null,
              },
              select: {
                id: true,
                decision: true,
                submittedAt: true,
              },
            })
          : await (async () => {
              const latestSubmission = await tx.documentSubmission.findFirst({
                where: {
                  workspaceId,
                  documentId,
                },
                orderBy: {
                  submittedAt: "desc",
                },
                select: {
                  id: true,
                },
              });
              if (!latestSubmission) {
                throw new AppError({ code: "INVALID_TRANSITION" });
              }
              return tx.documentSubmission.update({
                where: {
                  id: latestSubmission.id,
                },
                data: {
                  decision: action === "approve" ? "approved" : "changes_requested",
                  decidedById: actorUserId,
                  decidedAt: new Date(),
                  decisionNote: action === "request_changes" ? note?.trim() ?? null : null,
                },
                select: {
                  id: true,
                  decision: true,
                  submittedAt: true,
                },
              });
            })();

      return {
        document: transitioned,
        submission,
      };
    });

    // Best-effort telemetry: do not fail business transition when logging fails.
    try {
      const activityEvent = await this.prisma.activityEvent.create({
        data: {
          workspaceId,
          actorId: actorUserId,
          actorNameSnapshot: actorProfile?.fullName ?? "Unknown user",
          actorAvatarSnapshot: actorProfile?.avatarUrl ?? null,
          eventKey: action === "submit" ? "document.submitted" : "document.reviewed",
          summary:
            action === "submit"
              ? `${actorProfile?.fullName ?? "A user"} submitted '${document.title}' for review`
              : `${actorProfile?.fullName ?? "A reviewer"} ${
                  action === "approve" ? "approved" : "requested changes for"
                } '${document.title}'`,
          resourceType: "document",
          resourceId: documentId,
          resourceTitleSnapshot: document.title,
          metadata: {
            action,
            status: nextStatus,
          },
        },
      });
      this.eventEmitter.emit("activity.recorded", {
        workspaceId,
        activityEvent: activityEvent as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.warn("[documents] failed to write activity event", error);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          severity: "info",
          actionKey: `document.${action}`,
          actorId: actorUserId,
          actorEmail: actorProfile?.email ?? null,
          actorGlobalRole: actorProfile?.globalRole ?? null,
          workspaceId,
          targetType: "document",
          targetId: documentId,
          metadata: {
            action,
            fromStatus: document.status,
            toStatus: nextStatus,
          },
        },
      });
    } catch (error) {
      console.warn("[documents] failed to write audit log", error);
    }

    this.eventEmitter.emit("document.status_changed", {
      workspaceId,
      documentId,
      fromStatus: document.status,
      toStatus: nextStatus,
    });
    if (action === "submit") {
      this.eventEmitter.emit("document.submitted", {
        workspaceId,
        documentId,
        submittedById: actorUserId,
      });
    } else if (action === "approve") {
      this.eventEmitter.emit("document.approved", {
        workspaceId,
        documentId,
        approvedById: actorUserId,
      });
    }

    return updated;
  }

  async getDocumentsTree({
    actorUserId,
    workspaceId,
  }: {
    actorUserId: string;
    workspaceId: string;
  }) {
    await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    const [folders, documents] = await Promise.all([
      this.prisma.folder.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
        select: {
          id: true,
          name: true,
          parentId: true,
          position: true,
          createdAt: true,
        },
      }),
      this.prisma.document.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ folderId: "asc" }, { position: "asc" }],
        select: {
          id: true,
          folderId: true,
          title: true,
          status: true,
          position: true,
          isLocked: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
    return { folders, documents };
  }

  async softDeleteDocument({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    assertManagerOrAbove(membership.role);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    if (doc.status !== "draft") {
      throw new AppError({
        code: "DOCUMENT_READONLY_STATUS",
        message: "Only draft documents can be deleted.",
      });
    }
    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), updatedById: actorUserId },
    });
    this.eventEmitter.emit("document.deleted", {
      workspaceId,
      actorId: actorUserId,
      documentId,
    });
    return { message: "Document deleted." };
  }

  async lockDocument({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    assertManagerOrAbove(membership.role);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true, isLocked: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    const now = new Date();
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isLocked: true,
        lockedByUserId: actorUserId,
        lockedAt: now,
        updatedById: actorUserId,
      },
      select: {
        id: true,
        isLocked: true,
        lockedAt: true,
        lockedByUserId: true,
      },
    });
    this.eventEmitter.emit("document.locked", {
      workspaceId,
      documentId: updated.id,
      lockedById: actorUserId,
    });
    return updated;
  }

  async unlockDocument({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    assertManagerOrAbove(membership.role);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isLocked: false,
        lockedByUserId: null,
        lockedAt: null,
        updatedById: actorUserId,
      },
      select: {
        id: true,
        isLocked: true,
        lockedAt: true,
        lockedByUserId: true,
      },
    });
    this.eventEmitter.emit("document.unlocked", {
      workspaceId,
      documentId: updated.id,
    });
    return updated;
  }

  async listDocumentVersions({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId, workspaceId },
      orderBy: { versionNumber: "desc" },
      select: {
        id: true,
        versionNumber: true,
        reason: true,
        createdAt: true,
        createdById: true,
      },
    });
    return { items: versions, total: versions.length };
  }

  async restoreDocumentVersion({
    actorUserId,
    workspaceId,
    documentId,
    versionId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
    versionId: string;
  }) {
    const membership = await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    assertManagerOrAbove(membership.role);

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.document.findFirst({
        where: { id: documentId, workspaceId, deletedAt: null },
        select: {
          id: true,
          status: true,
          isLocked: true,
          contentYjs: true,
          contentPlaintext: true,
        },
      });
      if (!current) {
        throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
      }
      if (
        isDocumentReadOnly({
          status: current.status,
          isLocked: current.isLocked,
          role: membership.role,
        })
      ) {
        throw new AppError({ code: "DOCUMENT_READONLY_STATUS" });
      }
      const target = await tx.documentVersion.findFirst({
        where: { id: versionId, documentId, workspaceId },
      });
      if (!target) {
        throw new AppError({ code: "NOT_FOUND", message: "Version not found" });
      }
      const latest = await tx.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const nextNum = (latest?.versionNumber ?? 0) + 1;
      await tx.documentVersion.create({
        data: {
          workspaceId,
          documentId,
          versionNumber: nextNum,
          reason: "before_restore",
          yjsState: current.contentYjs,
          plaintext: current.contentPlaintext,
          createdById: actorUserId,
        },
      });
      const restored = await tx.document.update({
        where: { id: documentId },
        data: {
          contentYjs: target.yjsState,
          contentPlaintext: target.plaintext ?? "",
          updatedById: actorUserId,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
      return restored;
    });
    this.eventEmitter.emit("document.updated", {
      workspaceId,
      actorId: actorUserId,
      documentId,
    });
    return result;
  }

  async listDocumentSubmissions({
    actorUserId,
    workspaceId,
    documentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    documentId: string;
  }) {
    await this.requireWorkspaceMembership({ actorUserId, workspaceId });
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    const items = await this.prisma.documentSubmission.findMany({
      where: { workspaceId, documentId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        submittedAt: true,
        submittedById: true,
        decision: true,
        decidedAt: true,
        decidedById: true,
        decisionNote: true,
        snapshotVersionId: true,
      },
    });
    return { items, total: items.length };
  }

  private async requireWorkspaceMembership({
    actorUserId,
    workspaceId,
  }: {
    actorUserId: string;
    workspaceId: string;
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
        role: true,
        workspace: { select: { id: true, type: true, status: true } },
      },
    });

    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }

    return membership;
  }
}
