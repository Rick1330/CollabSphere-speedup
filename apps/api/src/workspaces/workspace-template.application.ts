import type { Prisma, TaskStatus, WorkspaceType } from "@prisma/client";
import { AppError } from "../common/filters/app-error.filter.js";

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

export const parseWorkspaceTemplateContent = (raw: unknown): WorkspaceTemplateContentV2 => {
  if (!isRecord(raw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  if (raw.schemaVersion !== 2) {
    throw new AppError({ code: "TEMPLATE_SCHEMA_UNSUPPORTED" });
  }

  const foldersRaw = raw.folders;
  const documentsRaw = raw.documents;
  const taskColumnsRaw = raw.taskColumns;
  const settingsRaw = raw.settings;

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
          key: entry.key.trim(),
          name: entry.name.trim(),
          parentKey:
            parentKey === undefined ? undefined : parentKey === null ? null : parentKey.trim(),
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
          title: entry.title.trim(),
          folderKey:
            folderKey === undefined ? undefined : folderKey === null ? null : folderKey.trim(),
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
          name: entry.name.trim(),
          status: entry.status as TaskStatus,
        };
      })
    : undefined;

  if (settingsRaw !== undefined && settingsRaw !== null && !isRecord(settingsRaw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  return {
    schemaVersion: 2,
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
  workspaceType,
  actorUserId,
  templateContent,
}: {
  tx: Prisma.TransactionClient;
  workspaceId: string;
  workspaceType: WorkspaceType;
  actorUserId: string;
  templateContent: WorkspaceTemplateContentV2;
}) => {
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
        name: spec.name,
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
        title: spec.title,
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
        name: col.name,
        status: col.status,
        position: index + 1,
      })),
    });
  }

  const baseSettings = buildDefaultWorkspaceSettings(workspaceType);
  const mergedSettings = {
    ...baseSettings,
    ...(templateContent.settings ?? {}),
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

