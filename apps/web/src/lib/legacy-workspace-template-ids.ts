/** Keep in sync with apps/api/src/templates/legacy-workspace-template-ids.ts */
export const LEGACY_WORKSPACE_TEMPLATE_IDS = [
  "professional-team",
  "academic-thesis",
  "academic-coursework",
  "general-blank",
] as const;

export function isLegacyWorkspaceTemplateId(id: string): boolean {
  return (LEGACY_WORKSPACE_TEMPLATE_IDS as readonly string[]).includes(id);
}
