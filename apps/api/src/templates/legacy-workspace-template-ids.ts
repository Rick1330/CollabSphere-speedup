/** Obsolete workspace template rows from pre–addendum seeds; never expose or upsert. */
export const LEGACY_WORKSPACE_TEMPLATE_IDS = [
  "professional-team",
  "academic-thesis",
  "academic-coursework",
  "general-blank",
] as const;

export type LegacyWorkspaceTemplateId = (typeof LEGACY_WORKSPACE_TEMPLATE_IDS)[number];

export function isLegacyWorkspaceTemplateId(id: string): id is LegacyWorkspaceTemplateId {
  return (LEGACY_WORKSPACE_TEMPLATE_IDS as readonly string[]).includes(id);
}
