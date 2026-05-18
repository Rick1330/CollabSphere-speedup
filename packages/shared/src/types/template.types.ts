/**
 * CollabSphere template V2 contracts — document and workspace templates.
 */

export type TemplateContentFormat =
  | "markdown"
  | "document-v2"
  | "structured"
  | "richdocument"
  | "workspace-v2";

export interface PageLayoutMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

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

/** JSON-safe rich document fragment (Tiptap/Yjs seed). */
export type RichContent = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface CoverRegionConfig {
  type: "cover";
  institutionLogo: { url: string; width: number; alignment: "center" | "left" } | null;
  institutionName: string | null;
  subInstitutionName: string | null;
  documentTypeLabel: string;
  projectTitleVariable: string;
  subtitleVariable: string | null;
  submissionStatement: string | null;
  authorTableType: "group-members" | "single-author" | "none";
  groupMemberCount: number;
  advisorField: boolean;
  yearVariable: string;
  footerInstitution: string | null;
}

export interface DeclarationRegionConfig {
  type: "declaration";
  memberCount: number;
  advisorSection: boolean;
  examinerCount: number;
  programField: boolean;
  projectTitleField: boolean;
}

export interface RolesMatrixRegionConfig {
  type: "roles-matrix";
  memberCount: number;
  defaultTasks: string[];
}

export interface TocRegionConfig {
  type: "toc";
  maxDepth: 3 | 4;
  includePageNumbers: boolean;
  dotLeader: boolean;
}

export interface SubsectionSpec {
  number: string;
  title: string;
  instructionText: string;
  required: boolean;
}

export interface ChapterRegionConfig {
  type: "chapter";
  chapterNumber: number;
  subsections: SubsectionSpec[];
}

export interface AcronymsRegionConfig {
  type: "acronyms";
  autoSort: boolean;
}

export interface ReferencesRegionConfig {
  type: "references";
  style: "apa" | "ieee" | "harvard" | "mla";
}

export type RegionConfig =
  | CoverRegionConfig
  | DeclarationRegionConfig
  | RolesMatrixRegionConfig
  | TocRegionConfig
  | ChapterRegionConfig
  | AcronymsRegionConfig
  | ReferencesRegionConfig
  | { type: "generic" };

export interface DocumentRegion {
  id: string;
  type: RegionType;
  key: string;
  title: string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  printOnly?: boolean;
  frontMatter?: boolean;
  locked?: boolean;
  editRestriction?: "none" | "member-plus" | "manager-plus" | "owner-only";
  content?: RichContent;
  config?: RegionConfig;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type?: "text" | "year" | "select" | "date" | "multiline";
  required?: boolean;
  defaultValue?: string | null;
  maxLength?: number | null;
  options?: string[] | null;
  placeholder?: string;
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

export interface TaskLabelDef {
  name: string;
  color: string;
  description: string;
}

export interface WorkspaceDefaults {
  workspaceSettings: {
    submissionWorkflowEnabled: boolean;
    allowViewerCommentsOnDocs: boolean;
    allowViewerCommentsOnTasks: boolean;
    allowViewerExport?: boolean;
  };
  roleLabels: Record<"OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER", string>;
  taskLabels: TaskLabelDef[];
  onboardingDocKey: string | null;
}

export interface FolderSpec {
  key: string;
  name: string;
  parentKey: string | null;
  description?: string;
  icon?: string;
}

export interface DocumentSpec {
  key: string;
  title: string;
  folderKey: string | null;
  documentTemplateId: string;
  description?: string;
  submissionEnabled?: boolean;
  initialStatus?: "draft";
}

export interface TaskColumnSpec {
  key: string;
  name: string;
  status: string;
  position: number;
}

export interface TaskBoardSpec {
  columns: TaskColumnSpec[];
  defaultLabels: string[];
}

export interface WorkspaceStructure {
  folders: FolderSpec[];
  documents: DocumentSpec[];
  taskBoard: TaskBoardSpec;
}

export interface WorkspaceTemplateV2 {
  id: string;
  kind: "workspace";
  category: "professional" | "academic" | "general";
  subCategory: string;
  scope: "system" | "workspace";
  name: string;
  description: string;
  tagline?: string;
  version: number;
  schemaVersion: 2;
  isEnabled: boolean;
  personas?: Array<{
    label: string;
    role: string;
    count: string;
  }>;
  defaults: WorkspaceDefaults;
  structure: WorkspaceStructure;
  preview?: {
    thumbnail: string | null;
    highlights: string[];
    estimatedSetupMinutes: number;
    tags: string[];
  };
}
