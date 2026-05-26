import type { PageSetup } from "./page-setup.js";

export type ImportWarningType = "info" | "warning" | "error";

export interface ImportWarning {
  type: ImportWarningType;
  message: string;
  page?: number;
}

export interface WordParagraphStyle {
  id: string;
  name: string;
  fontSizePt: number;
  lineHeight: number;
  fontFamily: string;
  spacingBeforePx: number;
  spacingAfterPx: number;
  bold?: boolean;
  italic?: boolean;
}

export interface DocumentStructure {
  pageSetup: PageSetup;
  styles: Map<string, WordParagraphStyle>;
  defaultStyle: WordParagraphStyle;
  warnings: ImportWarning[];
  mammothStyleMap: string[];
}

export interface DocxImportMetadata {
  pageCount: number;
  wordCount: number;
  characterCount: number;
  hasImages: boolean;
  hasTables: boolean;
}

export interface DocxImportResult {
  content: import("@tiptap/core").JSONContent;
  pageSetup: PageSetup;
  warnings: ImportWarning[];
  metadata: DocxImportMetadata;
}

export interface ImportOptions {
  preserveFormatting?: boolean;
  importImages?: boolean;
  importTables?: boolean;
}
