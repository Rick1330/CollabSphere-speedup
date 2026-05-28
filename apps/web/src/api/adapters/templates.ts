/**
 * Templates API adapter — catalog reads from Nest `GET /api/v1/templates`.
 */
import { request } from "@/api/client";
import { parseApiListEnvelope } from "@/api/client/envelope";
import {
  DOCUMENT_TEMPLATES,
  getDocumentTemplate,
  type DocumentTemplate,
  type WorkspaceTemplate,
  type TemplateCategory,
} from "@/lib/mock-templates";
import { isLegacyWorkspaceTemplateId } from "@/lib/legacy-workspace-template-ids";

export type { WorkspaceTemplate, DocumentTemplate, TemplateCategory };
export {
  buildDocumentSeed,
  stashPendingDoc,
  readPendingDoc,
  clearPendingDoc,
} from "@/lib/mock-template-seed";

export { getDocumentTemplate, DOCUMENT_TEMPLATES };

type ApiTemplateRow = {
  id: string;
  kind: string;
  category: string;
  subCategory?: string | null;
  name: string;
  description?: string | null;
  content?: unknown;
};

type ParsedWorkspacePreview = {
  folders: string[];
  documents: { title: string; folder: string }[];
  taskColumns: string[];
  submissionWorkflowEnabled: boolean;
  roleLabel: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseWorkspacePreviewFromContent(content: unknown): ParsedWorkspacePreview {
  const fallback: ParsedWorkspacePreview = {
    folders: [],
    documents: [],
    taskColumns: [],
    submissionWorkflowEnabled: false,
    roleLabel: "MEMBER",
  };
  if (!isRecord(content)) return fallback;

  const structure = isRecord(content.structure) ? content.structure : null;
  const workspace = structure && isRecord(structure.workspace) ? structure.workspace : null;
  if (!workspace) return fallback;

  const folders = Array.isArray(workspace.folders)
    ? workspace.folders
        .filter(isRecord)
        .map((folder) => (typeof folder.name === "string" ? folder.name.trim() : ""))
        .filter((name) => name.length > 0)
    : [];

  const documents = Array.isArray(workspace.documents)
    ? workspace.documents
        .filter(isRecord)
        .map((doc) => ({
          title: typeof doc.title === "string" ? doc.title.trim() : "",
          folder: typeof doc.folderKey === "string" ? doc.folderKey.trim() : "",
        }))
        .filter((doc) => doc.title.length > 0)
    : [];

  const taskBoard = isRecord(workspace.taskBoard) ? workspace.taskBoard : null;
  const taskColumnsSource = taskBoard && Array.isArray(taskBoard.columns) ? taskBoard.columns : [];
  const taskColumns = taskColumnsSource
    .filter(isRecord)
    .map((column) => (typeof column.name === "string" ? column.name.trim() : ""))
    .filter((name) => name.length > 0);

  const defaults = isRecord(workspace.defaults) ? workspace.defaults : null;
  const roleLabels = defaults && isRecord(defaults.roleLabels) ? defaults.roleLabels : null;
  const workspaceSettings =
    defaults && isRecord(defaults.workspaceSettings) ? defaults.workspaceSettings : null;

  const roleLabel =
    roleLabels && typeof roleLabels.MEMBER === "string" && roleLabels.MEMBER.trim().length > 0
      ? roleLabels.MEMBER.trim()
      : "MEMBER";

  const submissionWorkflowEnabled =
    workspaceSettings && typeof workspaceSettings.submissionWorkflowEnabled === "boolean"
      ? workspaceSettings.submissionWorkflowEnabled
      : false;

  return {
    folders,
    documents,
    taskColumns,
    submissionWorkflowEnabled,
    roleLabel,
  };
}

function mapDocumentTemplate(row: ApiTemplateRow): DocumentTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: "writing",
    estReadMin: 5,
    preview: { sections: [row.name] },
  };
}

function mapWorkspaceTemplate(row: ApiTemplateRow): WorkspaceTemplate {
  const preview = parseWorkspacePreviewFromContent(row.content);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category as TemplateCategory,
    tagline: row.description ?? row.name,
    preview: {
      folders: preview.folders,
      documents: preview.documents,
      taskColumns: preview.taskColumns,
      settings: {
        submissionWorkflowEnabled: preview.submissionWorkflowEnabled,
        roleLabel: preview.roleLabel,
      },
    },
  };
}

export async function listDocumentTemplatesFromApi(
  workspaceType: TemplateCategory,
): Promise<DocumentTemplate[]> {
  try {
    const payload = await request<unknown>(
      `/templates?kind=document&category=${encodeURIComponent(workspaceType)}`,
    );
    const { items } = parseApiListEnvelope<ApiTemplateRow>(payload);
    const blank: DocumentTemplate = {
      id: "doc-blank",
      name: "Blank document",
      description: "Start from an empty page.",
      category: "writing",
      estReadMin: 1,
      preview: { sections: [] },
    };
    if (items.length === 0) {
      return [
        blank,
        ...DOCUMENT_TEMPLATES.filter((t) => t.id === "doc-blank" || t.category === "writing"),
      ];
    }
    return [blank, ...items.map(mapDocumentTemplate)];
  } catch {
    return DOCUMENT_TEMPLATES;
  }
}

export async function listWorkspaceTemplatesFromApi(
  workspaceType: TemplateCategory,
): Promise<WorkspaceTemplate[]> {
  try {
    const payload = await request<unknown>(
      `/templates?kind=workspace&category=${encodeURIComponent(workspaceType)}`,
    );
    const { items } = parseApiListEnvelope<ApiTemplateRow>(payload);
    return items
      .filter((row) => !isLegacyWorkspaceTemplateId(row.id))
      .map(mapWorkspaceTemplate);
  } catch {
    return [];
  }
}
