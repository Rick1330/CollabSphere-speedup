import type { Prisma, TaskStatus, WorkspaceType } from "@prisma/client";
import { AppError } from "../common/filters/app-error.filter.js";
import { parseTemplateEnvelopeV2 } from "../common/templates/template-schema.js";
import { parseDocumentTemplateContent } from "../common/templates/template-schema.js";
import { resolveDocumentSeedFromTemplate } from "../documents/document-template-seed.service.js";

type TemplateFolderSpec = {
  key: string;
  name: string;
  parentKey?: string | null;
};

type TemplateDocumentSpec = {
  key?: string;
  title: string;
  folderKey?: string | null;
  documentTemplateId?: string | null;
  submissionEnabled?: boolean;
  initialStatus?: "draft";
};

type TemplateTaskColumnSpec = {
  name: string;
  status: TaskStatus;
  position?: number;
};

type TemplateTaskLabelSpec = {
  name: string;
  color: string;
  description?: string;
};

export type WorkspaceTemplateContentV2 = {
  schemaVersion: 2;
  format?: string;
  metadata?: {
    title?: string;
    category?: string;
    kind?: string;
  };
  folders?: TemplateFolderSpec[];
  documents?: TemplateDocumentSpec[];
  taskColumns?: TemplateTaskColumnSpec[];
  settings?: Record<string, unknown>;
  taskLabels?: TemplateTaskLabelSpec[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validTaskStatuses: readonly TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

type WorkspaceTemplateVariables = {
  workspaceName: string;
  workspaceType: WorkspaceType;
  ownerUserId: string;
};

const sanitizeTemplateString = (value: string) => value.trim();

const substituteTemplateVariables = ({
  value,
  variables,
}: {
  value: string;
  variables: WorkspaceTemplateVariables;
}) =>
  value
    .replaceAll("{{workspaceName}}", variables.workspaceName)
    .replaceAll("{{workspaceType}}", variables.workspaceType)
    .replaceAll("{{ownerUserId}}", variables.ownerUserId);

const substituteSettingsVariables = ({
  value,
  variables,
}: {
  value: unknown;
  variables: WorkspaceTemplateVariables;
}): unknown => {
  if (typeof value === "string") {
    return substituteTemplateVariables({ value, variables });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => substituteSettingsVariables({ value: entry, variables }));
  }

  if (isRecord(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      next[key] = substituteSettingsVariables({ value: entryValue, variables });
    }
    return next;
  }

  return value;
};

const resolveRawWorkspaceTemplatePayload = (raw: Record<string, unknown>) => {
  const workspacePayload = raw.workspace;
  if (isRecord(workspacePayload)) {
    return {
      ...workspacePayload,
      schemaVersion: raw.schemaVersion,
      format: typeof raw.format === "string" ? raw.format : undefined,
      metadata: isRecord(raw.metadata) ? raw.metadata : undefined,
    };
  }
  return raw;
};

export const parseWorkspaceTemplateContent = (raw: unknown): WorkspaceTemplateContentV2 => {
  if (!isRecord(raw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  const envelope = parseTemplateEnvelopeV2({
    raw,
    allowedFormats: ["workspace-v2", "structured"],
  });
  const payloadSource =
    envelope.structure && Object.keys(envelope.structure).length > 0
      ? envelope.structure
      : raw;
  const payload = resolveRawWorkspaceTemplatePayload({
    ...(payloadSource as Record<string, unknown>),
    schemaVersion: envelope.schemaVersion,
    format: envelope.format,
    metadata: envelope.metadata,
  });
  const metadataRaw = payload.metadata;

  const foldersRaw = payload.folders;
  const documentsRaw = payload.documents;
  const taskColumnsRaw = payload.taskColumns;
  const taskBoardRaw = payload.taskBoard;
  const settingsRaw = payload.settings;
  const defaultsRaw = payload.defaults;

  const taskLabelsRawFromDefaults =
    isRecord(defaultsRaw) && isRecord(defaultsRaw.taskLabels) ? defaultsRaw.taskLabels : undefined;
  const taskLabelsRaw =
    (isRecord(defaultsRaw) && Array.isArray(defaultsRaw.taskLabels) ? defaultsRaw.taskLabels : undefined) ??
    (Array.isArray(payload.taskLabels) ? payload.taskLabels : undefined);

  const folders: TemplateFolderSpec[] | undefined = Array.isArray(foldersRaw)
    ? foldersRaw.map((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.key) || !isNonEmptyString(entry.name)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        const parentKey = entry.parentKey;
        if (parentKey !== undefined && parentKey !== null && !isNonEmptyString(parentKey)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        return {
          key: sanitizeTemplateString(entry.key),
          name: sanitizeTemplateString(entry.name),
          parentKey:
            parentKey === undefined
              ? undefined
              : parentKey === null
                ? null
                : sanitizeTemplateString(parentKey),
        };
      })
    : undefined;

  const documents: TemplateDocumentSpec[] | undefined = Array.isArray(documentsRaw)
    ? documentsRaw.map((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.title)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        const folderKey = entry.folderKey;
        if (folderKey !== undefined && folderKey !== null && !isNonEmptyString(folderKey)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        const docTemplateId = entry.documentTemplateId;
        if (docTemplateId !== undefined && docTemplateId !== null && !isNonEmptyString(docTemplateId)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        return {
          key: typeof entry.key === "string" ? sanitizeTemplateString(entry.key) : undefined,
          title: sanitizeTemplateString(entry.title),
          folderKey:
            folderKey === undefined
              ? undefined
              : folderKey === null
                ? null
                : sanitizeTemplateString(folderKey),
          documentTemplateId:
            docTemplateId === undefined
              ? undefined
              : docTemplateId === null
                ? null
                : sanitizeTemplateString(docTemplateId),
          submissionEnabled: Boolean(entry.submissionEnabled),
          initialStatus: "draft",
        };
      })
    : undefined;

  const taskColumnsSource =
    Array.isArray(taskColumnsRaw)
      ? taskColumnsRaw
      : isRecord(taskBoardRaw) && Array.isArray(taskBoardRaw.columns)
        ? taskBoardRaw.columns
        : undefined;

  const taskColumns: TemplateTaskColumnSpec[] | undefined = Array.isArray(taskColumnsSource)
    ? taskColumnsSource.map((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name) || typeof entry.status !== "string") {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        if (!validTaskStatuses.includes(entry.status as TaskStatus)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        const pos = entry.position;
        const position =
          typeof pos === "number" && Number.isFinite(pos) ? pos : undefined;
        return {
          name: sanitizeTemplateString(entry.name),
          status: entry.status as TaskStatus,
          position,
        };
      })
    : undefined;

  if (settingsRaw !== undefined && settingsRaw !== null && !isRecord(settingsRaw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  // Guide v2 defaults: merge defaults.workspaceSettings + defaults.roleLabels into settings.
  const defaultSettings =
    isRecord(defaultsRaw) && isRecord(defaultsRaw.workspaceSettings)
      ? defaultsRaw.workspaceSettings
      : undefined;
  const defaultRoleLabels =
    isRecord(defaultsRaw) && isRecord(defaultsRaw.roleLabels)
      ? defaultsRaw.roleLabels
      : undefined;
  const onboardingDocKey =
    isRecord(defaultsRaw) && typeof defaultsRaw.onboardingDocKey === "string"
      ? defaultsRaw.onboardingDocKey.trim()
      : undefined;

  const mergedSettingsRaw = {
    ...(defaultSettings && isRecord(defaultSettings) ? defaultSettings : {}),
    ...(defaultRoleLabels && isRecord(defaultRoleLabels) ? { roleLabels: defaultRoleLabels } : {}),
    ...(onboardingDocKey ? { onboardingDocKey } : {}),
    ...(settingsRaw && isRecord(settingsRaw) ? settingsRaw : {}),
  };

  const taskLabels: TemplateTaskLabelSpec[] | undefined = Array.isArray(taskLabelsRaw)
    ? taskLabelsRaw.map((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name) || !isNonEmptyString(entry.color)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        const desc = entry.description;
        if (desc !== undefined && desc !== null && typeof desc !== "string") {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        return {
          name: sanitizeTemplateString(entry.name),
          color: sanitizeTemplateString(entry.color),
          description: typeof desc === "string" ? sanitizeTemplateString(desc) : undefined,
        };
      })
    : undefined;

  return {
    schemaVersion: 2,
    format: typeof payload.format === "string" ? payload.format : undefined,
    metadata:
      metadataRaw && isRecord(metadataRaw)
        ? {
            title:
              typeof metadataRaw.title === "string"
                ? sanitizeTemplateString(metadataRaw.title)
                : undefined,
            category:
              typeof metadataRaw.category === "string"
                ? sanitizeTemplateString(metadataRaw.category)
                : undefined,
            kind:
              typeof metadataRaw.kind === "string"
                ? sanitizeTemplateString(metadataRaw.kind)
                : undefined,
          }
        : undefined,
    folders,
    documents,
    taskColumns,
    settings: Object.keys(mergedSettingsRaw).length > 0 ? mergedSettingsRaw : undefined,
    taskLabels,
  };
};

const WORKSPACE_ROLE_KEYS = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"] as const;

export type WorkspaceRoleLabelsMap = Partial<
  Record<(typeof WORKSPACE_ROLE_KEYS)[number], string>
>;

export const extractRoleLabelsFromSettings = (
  settings: unknown,
): WorkspaceRoleLabelsMap | undefined => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return undefined;
  const raw = (settings as Record<string, unknown>).roleLabels;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: WorkspaceRoleLabelsMap = {};
  for (const role of WORKSPACE_ROLE_KEYS) {
    const label = (raw as Record<string, unknown>)[role];
    if (typeof label === "string" && label.trim().length > 0) {
      out[role] = label.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export const resolveRoleLabel = (
  role: (typeof WORKSPACE_ROLE_KEYS)[number],
  roleLabels?: WorkspaceRoleLabelsMap,
): string => {
  const fromSettings = roleLabels?.[role];
  if (fromSettings) return fromSettings;
  if (role === "OWNER") return "Owner";
  return role
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export const buildDefaultWorkspaceSettings = (type: WorkspaceType) => {
  const roleLabels =
    type === "academic"
      ? {
          OWNER: "Instructor",
          ADMIN: "Advisor",
          MANAGER: "Supervisor",
          MEMBER: "Student",
          VIEWER: "Reviewer",
        }
      : type === "professional"
        ? {
            OWNER: "Owner",
            ADMIN: "Tech Lead",
            MANAGER: "Project Manager",
            MEMBER: "Developer",
            VIEWER: "Stakeholder",
          }
        : {
            OWNER: "Owner",
            ADMIN: "Admin",
            MANAGER: "Manager",
            MEMBER: "Member",
            VIEWER: "Viewer",
          };

  return {
    submissionWorkflowEnabled: type === "academic",
    allowViewerCommentsOnDocs: true,
    allowViewerCommentsOnTasks: false,
    allowViewerExport: false,
    roleLabels,
  };
};

export const applyWorkspaceTemplate = async ({
  tx,
  workspaceId,
  workspaceName,
  workspaceType,
  actorUserId,
  templateContent,
}: {
  tx: Prisma.TransactionClient;
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  actorUserId: string;
  templateContent: WorkspaceTemplateContentV2;
}) => {
  const variables: WorkspaceTemplateVariables = {
    workspaceName,
    workspaceType,
    ownerUserId: actorUserId,
  };
  const folderKeyToId = new Map<string, string>();

  const folders = templateContent.folders ?? [];
  for (let i = 0; i < folders.length; i += 1) {
    const spec = folders[i];
    const parentId =
      spec.parentKey === undefined || spec.parentKey === null
        ? null
        : (folderKeyToId.get(spec.parentKey) ?? null);

    // If a parentKey is provided but not found, treat as invalid template.
    if (spec.parentKey && !parentId) {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }

    const created = await tx.folder.create({
      data: {
        workspaceId,
        name: substituteTemplateVariables({
          value: spec.name,
          variables,
        }),
        parentId,
        position: i + 1,
        createdById: actorUserId,
      },
      select: { id: true },
    });
    folderKeyToId.set(spec.key, created.id);
  }

  const documents = templateContent.documents ?? [];
  const templateIds = Array.from(
    new Set(
      documents
        .map((d) => (typeof d.documentTemplateId === "string" ? d.documentTemplateId.trim() : ""))
        .filter(Boolean),
    ),
  );
  const templatesById =
    templateIds.length > 0
      ? new Map(
          (
            await tx.template.findMany({
              where: {
                id: { in: templateIds },
                kind: "document",
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
          ).map((t) => [t.id, t]),
        )
      : new Map();

  for (let i = 0; i < documents.length; i += 1) {
    const spec = documents[i];
    const folderId =
      spec.folderKey === undefined || spec.folderKey === null
        ? null
        : (folderKeyToId.get(spec.folderKey) ?? null);
    if (spec.folderKey && !folderId) {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }

    const title = substituteTemplateVariables({
      value: spec.title,
      variables,
    });

    const templateId = spec.documentTemplateId?.trim() || null;
    const template = templateId ? templatesById.get(templateId) ?? null : null;
    if (templateId && !template) {
      throw new AppError({ code: "TEMPLATE_NOT_FOUND" });
    }
    if (template && template.category !== workspaceType && template.category !== "general") {
      throw new AppError({ code: "TEMPLATE_CATEGORY_MISMATCH" });
    }

    let documentSeed: ReturnType<typeof resolveDocumentSeedFromTemplate> | null = null;
    if (template) {
      documentSeed = resolveDocumentSeedFromTemplate(template);
    }

    const templateProperties = documentSeed?.templateProperties ?? null;
    const propertiesWithSubmission =
      spec.submissionEnabled === undefined
        ? templateProperties
        : {
            ...(templateProperties && typeof templateProperties === "object"
              ? (templateProperties as Record<string, unknown>)
              : {}),
            workflow: {
              ...((templateProperties as Record<string, unknown> | null)?.workflow as
                | Record<string, unknown>
                | undefined),
              submissionEnabled: Boolean(spec.submissionEnabled),
            },
          };

    const createdDoc = await tx.document.create({
      data: {
        workspaceId,
        folderId,
        title,
        position: i + 1,
        contentPlaintext: documentSeed?.contentPlaintext ?? "",
        contentYjs: documentSeed?.contentYjs,
        properties: propertiesWithSubmission
          ? (JSON.parse(JSON.stringify(propertiesWithSubmission)) as Prisma.InputJsonValue)
          : undefined,
        templateId: template?.id ?? null,
        templateVersion: template?.version ?? null,
        templateSchemaVersion: documentSeed?.templateSchemaVersion ?? null,
        regionOrder: documentSeed?.regionOrder,
        createdById: actorUserId,
      },
      select: { id: true },
    });

    if (documentSeed && template) {
      const parsedTemplate = parseDocumentTemplateContent(template.content);
      if (parsedTemplate.variables?.length) {
        await tx.documentRegionVariable.createMany({
          data: parsedTemplate.variables.map((v) => ({
            documentId: createdDoc.id,
            workspaceId,
            variableKey: v.key,
            value: null,
          })),
        });
      }
    }
  }

  const taskColumns = templateContent.taskColumns;
  if (taskColumns && taskColumns.length > 0) {
    await tx.taskColumn.deleteMany({
      where: {
        workspaceId,
      },
    });

    await tx.taskColumn.createMany({
      data: taskColumns.map((col, index) => ({
        workspaceId,
        name: substituteTemplateVariables({
          value: col.name,
          variables,
        }),
        status: col.status,
        position: col.position ?? index + 1,
      })),
    });
  }

  const taskLabels = templateContent.taskLabels;
  if (taskLabels && taskLabels.length > 0) {
    await tx.taskLabel.createMany({
      data: taskLabels.map((label) => ({
        workspaceId,
        name: label.name,
        color: label.color,
        description: label.description ?? null,
        createdById: actorUserId,
      })),
      skipDuplicates: true,
    });
  }

  const baseSettings = buildDefaultWorkspaceSettings(workspaceType);
  const mergedSettings = {
    ...baseSettings,
    ...((templateContent.settings
      ? substituteSettingsVariables({
          value: templateContent.settings,
          variables,
        })
      : {}) as Record<string, unknown>),
  };

  await tx.workspaceSettings.update({
    where: {
      workspaceId,
    },
    data: {
      settings: mergedSettings,
    },
  });
};

