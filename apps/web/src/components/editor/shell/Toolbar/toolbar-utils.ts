import type { Editor } from "@tiptap/react";
import {
  DOC_BODY_FONT_SIZE_PT,
  DOC_HEADING_FONT_SIZE_PT,
} from "@/components/editor/canvas/pageSetup";
import { LINE_HEIGHT_OPTIONS, type LineHeightValue } from "@/components/editor/extensions/lineHeight";

export type ToolbarEditorProps = {
  editor: Editor | null;
  isReadOnly: boolean;
  onInsertTableRequest: () => void;
  onToggleComments?: () => void;
};

export type StyleItem = {
  id: string;
  label: string;
  previewClass: string;
  isActive: (editor: Editor) => boolean;
  apply: (editor: Editor) => void;
};

export const FONT_SIZE_MIN_PT = 8;
export const FONT_SIZE_MAX_PT = 72;

export const DOC_FONT_FAMILIES = [
  { id: "serif", label: "Source Serif 4", value: null as string | null },
  { id: "inter", label: "Inter", value: "Inter, system-ui, sans-serif" },
  { id: "georgia", label: "Georgia", value: "Georgia, Charter, serif" },
  { id: "system", label: "System UI", value: "system-ui, -apple-system, sans-serif" },
  { id: "mono", label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, monospace' },
  { id: "display", label: "Instrument Serif", value: '"Instrument Serif", Georgia, serif' },
] as const;

const STYLE_DISPLAY_LABELS: Record<string, string> = {
  normal: "Body",
  title: "Title",
  subtitle: "Subtitle",
  quote: "Quote",
  code: "Code",
  caption: "Caption",
};

type TextStyleChain = {
  setFontSize?: (size: string) => { run: () => boolean };
  unsetFontSize?: () => { run: () => boolean };
  setFontFamily?: (family: string) => { run: () => boolean };
  unsetFontFamily?: () => { run: () => boolean };
  unsetColor?: () => { run: () => boolean };
  unsetLineHeight?: () => { run: () => boolean };
  unsetTextAlign?: () => { run: () => boolean };
};

function chainFocus(editor: Editor) {
  return editor.chain().focus() as ReturnType<Editor["chain"]> & TextStyleChain;
}

/** Parse `11pt`, `11px`, or bare `11` from textStyle.fontSize. */
export function parseFontSizePt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = /^([\d.]+)\s*(pt|px)?$/i.exec(String(raw).trim());
  if (!match) return null;
  const n = parseFloat(match[1]);
  if (Number.isNaN(n)) return null;
  const unit = (match[2] ?? "pt").toLowerCase();
  return unit === "px" ? Math.round(n * 0.75) : Math.round(n);
}

export function getFontSizePt(editor: Editor | null): number {
  if (!editor || editor.isDestroyed) return DOC_BODY_FONT_SIZE_PT;
  const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
  return parseFontSizePt(raw) ?? DOC_BODY_FONT_SIZE_PT;
}

export function setFontSizePt(editor: Editor | null, pt: number): void {
  if (!editor || editor.isDestroyed) return;
  const clamped = Math.max(FONT_SIZE_MIN_PT, Math.min(FONT_SIZE_MAX_PT, Math.round(pt)));
  chainFocus(editor).setFontSize?.(`${clamped}pt`).run();
}

export function getActiveFontFamilyId(editor: Editor | null): string {
  if (!editor || editor.isDestroyed) return DOC_FONT_FAMILIES[0].id;
  const family = editor.getAttributes("textStyle").fontFamily as string | undefined;
  if (!family) return DOC_FONT_FAMILIES[0].id;
  const lower = family.toLowerCase();
  const match = DOC_FONT_FAMILIES.find((f) => {
    if (!f.value) return false;
    const probe = f.value.split(",")[0]?.replace(/['"]/g, "").trim().toLowerCase();
    return probe && lower.includes(probe);
  });
  return match?.id ?? DOC_FONT_FAMILIES[0].id;
}

export function getFontFamilyLabel(editor: Editor | null): string {
  const id = getActiveFontFamilyId(editor);
  return DOC_FONT_FAMILIES.find((f) => f.id === id)?.label ?? DOC_FONT_FAMILIES[0].label;
}

export function setFontFamilyChoice(editor: Editor | null, family: string | null): void {
  if (!editor || editor.isDestroyed) return;
  const chain = chainFocus(editor);
  if (family) {
    chain.setFontFamily?.(family).run();
  } else {
    chain.unsetFontFamily?.().run();
  }
}

export function getActiveStyleLabel(editor: Editor | null): string {
  if (!editor || editor.isDestroyed) return "Body";
  const active = STYLE_ITEMS.find((item) => item.isActive(editor));
  if (!active) return "Body";
  return STYLE_DISPLAY_LABELS[active.id] ?? active.label;
}

export function getLineHeight(editor: Editor | null): LineHeightValue {
  if (!editor || editor.isDestroyed) return "1.5";
  const type = editor.isActive("heading") ? "heading" : "paragraph";
  const raw = editor.getAttributes(type).lineHeight as string | undefined;
  if (raw && LINE_HEIGHT_OPTIONS.includes(raw as LineHeightValue)) {
    return raw as LineHeightValue;
  }
  return "1.5";
}

export function cycleLineHeight(editor: Editor | null): void {
  if (!editor || editor.isDestroyed) return;
  const current = getLineHeight(editor);
  const idx = LINE_HEIGHT_OPTIONS.indexOf(current);
  const next = LINE_HEIGHT_OPTIONS[(idx + 1) % LINE_HEIGHT_OPTIONS.length];
  (editor.chain().focus() as { setLineHeight?: (v: LineHeightValue) => { run: () => boolean } })
    .setLineHeight?.(next)
    .run();
}

export function handleIndentIncrease(editor: Editor | null): void {
  if (!editor || editor.isDestroyed) return;
  if (editor.isActive("listItem")) {
    editor.chain().focus().sinkListItem("listItem").run();
    return;
  }
  (editor.chain().focus() as { increaseIndent?: () => { run: () => boolean } }).increaseIndent?.().run();
}

export function handleIndentDecrease(editor: Editor | null): void {
  if (!editor || editor.isDestroyed) return;
  if (editor.isActive("listItem")) {
    editor.chain().focus().liftListItem("listItem").run();
    return;
  }
  (editor.chain().focus() as { decreaseIndent?: () => { run: () => boolean } }).decreaseIndent?.().run();
}

export async function copyEditorSelection(editor: Editor | null): Promise<void> {
  if (!editor || editor.isDestroyed) return;
  const { from, to } = editor.state.selection;
  const text = from === to ? editor.getText() : editor.state.doc.textBetween(from, to, "\n");
  await navigator.clipboard.writeText(text);
}

export async function cutEditorSelection(editor: Editor | null): Promise<void> {
  if (!editor || editor.isDestroyed) return;
  await copyEditorSelection(editor);
  editor.chain().focus().deleteSelection().run();
}

export async function pastePlainText(editor: Editor | null): Promise<void> {
  if (!editor || editor.isDestroyed) return;
  const text = await navigator.clipboard.readText();
  if (!text) return;
  editor.chain().focus().insertContent(text).run();
}

function applyHeadingStyle(editor: Editor, level: 1 | 2 | 3 | 4 | 5 | 6): void {
  chainFocus(editor).unsetFontSize?.().toggleHeading({ level }).run();
}

/** Safe when StarterKit history is off and Collaboration is not mounted yet. */
export function canUndo(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false;
  const undo = (editor.can() as { undo?: () => boolean }).undo;
  return typeof undo === "function" ? undo() : false;
}

export function canRedo(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false;
  const redo = (editor.can() as { redo?: () => boolean }).redo;
  return typeof redo === "function" ? redo() : false;
}

export function isActive(editor: Editor | null, name: string, attrs?: Record<string, unknown>): boolean {
  return editor?.isActive(name, attrs) ?? false;
}

export function handleInsertLink(editor: Editor | null): void {
  if (!editor) return;
  const previousUrl = (editor.getAttributes("link").href as string | undefined) ?? "";
  const url = window.prompt("Enter URL:", previousUrl);
  if (url === null) return;
  if (url === "") {
    (editor.chain().focus().extendMarkRange("link") as { unsetLink: () => { run: () => void } }).unsetLink().run();
    return;
  }
  (editor.chain().focus().extendMarkRange("link") as { setLink: (attrs: { href: string }) => { run: () => void } })
    .setLink({ href: url })
    .run();
}

export function clearFormatting(editor: Editor | null): void {
  if (!editor || editor.isDestroyed) return;
  const chain = chainFocus(editor);
  chain
    .clearNodes()
    .unsetAllMarks()
    .unsetFontSize?.()
    .unsetFontFamily?.()
    .unsetColor?.()
    .unsetLineHeight?.()
    .unsetTextAlign?.()
    .run();
}

export const STYLE_ITEMS: StyleItem[] = [
  {
    id: "title",
    label: "Title",
    previewClass: "cs-editor-style-preview-title",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    apply: (e) => applyHeadingStyle(e, 1),
  },
  {
    id: "subtitle",
    label: "Subtitle",
    previewClass: "cs-editor-style-preview-subtitle",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    apply: (e) => applyHeadingStyle(e, 2),
  },
  ...([1, 2, 3, 4, 5, 6] as const).map(
    (level): StyleItem => ({
      id: `h${level}`,
      label: `Heading ${level}`,
      previewClass: `cs-editor-style-preview-h${level}`,
      isActive: (e) => e.isActive("heading", { level }),
      apply: (e) => applyHeadingStyle(e, level),
    }),
  ),
  {
    id: "normal",
    label: "Normal",
    previewClass: "cs-editor-style-preview-normal",
    isActive: (e) => e.isActive("paragraph") && !e.isActive("heading"),
    apply: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "quote",
    label: "Quote",
    previewClass: "cs-editor-style-preview-quote",
    isActive: (e) => e.isActive("blockquote"),
    apply: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "Code",
    previewClass: "cs-editor-style-preview-code",
    isActive: (e) => e.isActive("codeBlock"),
    apply: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "caption",
    label: "Caption",
    previewClass: "cs-editor-style-preview-caption",
    isActive: (e) => e.isActive("heading", { level: 6 }),
    apply: (e) => applyHeadingStyle(e, 6),
  },
];

/** Re-export for toolbar tests and overflow labels. */
export { DOC_BODY_FONT_SIZE_PT, DOC_HEADING_FONT_SIZE_PT };

export type ToolbarGroupId =
  | "history"
  | "clipboard"
  | "styles"
  | "font"
  | "character"
  | "color"
  | "quickInsert"
  | "paragraph"
  | "lists"
  | "insert"
  | "review";

/** Spec §6.3: groups hidden first when toolbar overflows (see useToolbarOverflow). */
export const TOOLBAR_COLLAPSE_ORDER: ToolbarGroupId[] = [
  "styles",
  "character",
  "paragraph",
  "lists",
  "color",
  "font",
  "quickInsert",
  "insert",
  "review",
  "clipboard",
  "history",
];
