import type { Editor } from "@tiptap/react";
import { collectDocumentHeadings } from "@/features/documents/lib/document-headings";

export type HeadingSnapshot = string;

/** Stable fingerprint of document headings for TOC refresh deduplication. */
export function buildHeadingSnapshot(editor: Editor | null): HeadingSnapshot {
  if (!editor || editor.isDestroyed) return "";
  const headings = collectDocumentHeadings(editor);
  return headings
    .map((h) => `${h.pos}:${h.level}:${h.anchorId}:${h.text}`)
    .join("|");
}

export function hasHeadingDocChange(editor: Editor): boolean {
  if (editor.isDestroyed) return false;
  const { doc } = editor.state;
  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "heading") {
      found = true;
      return false;
    }
    return !found;
  });
  return found;
}
