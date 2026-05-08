import type { Prisma, TaskStatus, WorkspaceType } from "@prisma/client";
import { AppError } from "../common/filters/app-error.filter.js";
import { parseTemplateEnvelopeV2 } from "../common/templates/template-schema.js";

type TemplateFolderSpec = {
  key: string;
  name: string;
  parentKey?: string | null;
};

type TemplateDocumentSpec = {
  title: string;
  folderKey?: string | null;
};

type TemplateTaskColumnSpec = {
  name: string;
  status: TaskStatus;
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
  const settingsRaw = payload.settings;

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
        return {
          title: sanitizeTemplateString(entry.title),
          folderKey:
            folderKey === undefined
              ? undefined
              : folderKey === null
                ? null
                : sanitizeTemplateString(folderKey),
        };
      })
    : undefined;

  const taskColumns: TemplateTaskColumnSpec[] | undefined = Array.isArray(taskColumnsRaw)
    ? taskColumnsRaw.map((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name) || typeof entry.status !== "string") {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        if (!validTaskStatuses.includes(entry.status as TaskStatus)) {
          throw new AppError({ code: "TEMPLATE_INVALID" });
        }
        return {
          name: sanitizeTemplateString(entry.name),
          status: entry.status as TaskStatus,
        };
      })
    : undefined;

  if (settingsRaw !== undefined && settingsRaw !== null && !isRecord(settingsRaw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  return {
    schemaVersion: 2,
    format: typeof payload.format === "string" ? payload.format : undefined,
    metadata: metadataRaw
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
    settings: settingsRaw ? (settingsRaw as Record<string, unknown>) : undefined,
  };
};

export const buildDefaultWorkspaceSettings = (type: WorkspaceType) => {
  const roleLabels =
    type === "academic"
      ? { OWNER: "OWNER", ADMIN: "ADVISOR", MANAGER: "SUPERVISOR", MEMBER: "STUDENT", VIEWER: "REVIEWER" }
      : type === "professional"
        ? { OWNER: "OWNER", ADMIN: "TECH LEAD", MANAGER: "PROJECT MANAGER", MEMBER: "DEVELOPER", VIEWER: "STAKEHOLDER" }
        : { OWNER: "OWNER", ADMIN: "ADMIN", MANAGER: "MANAGER", MEMBER: "MEMBER", VIEWER: "VIEWER" };

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
  for (let i = 0; i < documents.length; i += 1) {
    const spec = documents[i];
    const folderId =
      spec.folderKey === undefined || spec.folderKey === null
        ? null
        : (folderKeyToId.get(spec.folderKey) ?? null);
    if (spec.folderKey && !folderId) {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }

    await tx.document.create({
      data: {
        workspaceId,
        folderId,
        title: substituteTemplateVariables({
          value: spec.title,
          variables,
        }),
        position: i + 1,
        createdById: actorUserId,
      },
      select: { id: true },
    });
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
        position: index + 1,
      })),
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

