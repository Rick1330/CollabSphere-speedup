/**
 * CollabSphere document template V2 — shared contract subset (see deep analysis doc Part 2).
 * Full editor/node surface grows in later phases; T1 persists metadata + variables only.
 */

export type TemplateContentFormat = "markdown" | "document-v2" | "structured" | "richdocument" | "workspace-v2";

export interface PageLayoutMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Placeholder for Part 2 page layout; expanded when PDF/export ships. */
export interface PageLayout {
  size: "A4" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  margins: PageLayoutMargins;
}

export type RegionType =
  | "cover"
  | "declaration"
  | "roles-matrix"
  | "acknowledgment"
  | "acronyms"
  | "toc"
  | "list-of-figures"
  | "list-of-tables"
  | "abstract"
  | "chapter"
  | "section"
  | "references"
  | "appendix"
  | "custom";

export interface DocumentRegion {
  id: string;
  type: RegionType;
  key: string;
  title: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  required?: boolean;
}

export interface DocumentTemplateV2 {
  id: string;
  kind: "document";
  category: "professional" | "academic" | "general";
  subCategory: string;
  scope: "system" | "workspace";
  name: string;
  description: string;
  version: number;
  schemaVersion: 2;
  contentFormat: TemplateContentFormat;
  isEnabled: boolean;
  pageLayout?: PageLayout;
  regions: DocumentRegion[];
  variables: TemplateVariable[];
}
