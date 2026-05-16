import type { DocumentTemplate, TemplateCategory } from "@/lib/mock-templates";

/** Seeded `Template` rows — document kind — and their workspace `type` bucket. */
const SEEDED_DOCUMENT_TEMPLATE_TYPE: Record<string, TemplateCategory> = {
  "meeting-notes": "general",
  "project-brief": "professional",
  "thesis-chapter": "academic",
  "coursework-assignment": "academic",
  "general-richdocument-pilot": "general",
};

/** Map UI mock document template id → Prisma `template.id` when seeded. */
const MOCK_DOC_ID_TO_SEED_ID: Record<string, string> = {
  "doc-meeting-notes": "meeting-notes",
  "doc-1on1": "meeting-notes",
  "doc-prd": "project-brief",
  "doc-rfc": "project-brief",
  "doc-adr": "project-brief",
  "doc-postmortem": "project-brief",
  "doc-spec": "project-brief",
  "doc-research-brief": "thesis-chapter",
  "doc-lit-review": "thesis-chapter",
};

/**
 * Resolves a mock catalog `doc-*` id to a real API `templateId`, only when the
 * seeded template's category matches the workspace type.
 */
export function resolveMockDocumentTemplateForApi(
  mockTemplateId: string | null | undefined,
  workspaceType: TemplateCategory,
): string | null {
  if (!mockTemplateId || mockTemplateId === "doc-blank") return null;
  const seedId = MOCK_DOC_ID_TO_SEED_ID[mockTemplateId];
  if (!seedId) return null;
  const bucket = SEEDED_DOCUMENT_TEMPLATE_TYPE[seedId];
  if (!bucket || bucket !== workspaceType) return null;
  return seedId;
}

const MOCK_WORKSPACE_ID_TO_SEED_ID: Record<string, string> = {
  "tpl-sw-dev": "professional-team",
  "tpl-client-work": "professional-team",
  "tpl-product-launch": "professional-team",
  "tpl-thesis": "academic-thesis",
  "tpl-research": "academic-thesis",
  "tpl-coursework": "academic-coursework",
  "tpl-personal": "general-blank",
  "tpl-blank": "general-blank",
};

const SEEDED_WORKSPACE_TEMPLATE_TYPE: Record<string, TemplateCategory> = {
  "general-blank": "general",
  "professional-team": "professional",
  "academic-thesis": "academic",
  "academic-coursework": "academic",
};

export function resolveWizardWorkspaceTemplateForApi(
  mockTemplateId: string | null | undefined,
  workspaceType: TemplateCategory,
): string | null {
  if (!mockTemplateId) return null;
  const seedId = MOCK_WORKSPACE_ID_TO_SEED_ID[mockTemplateId];
  if (!seedId) return null;
  const bucket = SEEDED_WORKSPACE_TEMPLATE_TYPE[seedId];
  if (!bucket || bucket !== workspaceType) return null;
  return seedId;
}

export function documentTemplateCategoriesForWorkspace(
  workspaceType: TemplateCategory,
): ReadonlySet<DocumentTemplate["category"]> {
  const byType: Record<TemplateCategory, DocumentTemplate["category"][]> = {
    professional: ["meeting", "planning", "engineering", "writing"],
    academic: ["meeting", "research", "writing"],
    general: ["meeting", "planning", "research", "writing", "engineering"],
  };
  return new Set(byType[workspaceType]);
}
