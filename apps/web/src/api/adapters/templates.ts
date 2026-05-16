/**
 * Templates API adapter — catalog reads from Nest `GET /api/v1/templates`.
 */
import { request } from "@/api/client";
import { parseApiListEnvelope } from "@/api/client/envelope";
import {
  DOCUMENT_TEMPLATES,
  WORKSPACE_TEMPLATES,
  getDocumentTemplate,
  getWorkspaceTemplate,
  type DocumentTemplate,
  type WorkspaceTemplate,
  type TemplateCategory,
} from "@/lib/mock-templates";

export type { WorkspaceTemplate, DocumentTemplate, TemplateCategory };
export {
  buildDocumentSeed,
  stashPendingDoc,
  readPendingDoc,
  clearPendingDoc,
} from "@/lib/mock-template-seed";

export { getDocumentTemplate, getWorkspaceTemplate, DOCUMENT_TEMPLATES, WORKSPACE_TEMPLATES };

type ApiTemplateRow = {
  id: string;
  kind: string;
  category: string;
  subCategory?: string | null;
  name: string;
  description?: string | null;
};

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
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category as TemplateCategory,
    tagline: row.description ?? row.name,
    preview: {
      folders: [],
      documents: [],
      taskColumns: [],
      settings: {
        submissionWorkflowEnabled: row.category === "academic",
        roleLabel: "MEMBER",
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
    if (items.length === 0) {
      return WORKSPACE_TEMPLATES.filter((t) => t.category === workspaceType);
    }
    return items.map(mapWorkspaceTemplate);
  } catch {
    return WORKSPACE_TEMPLATES.filter((t) => t.category === workspaceType);
  }
}
