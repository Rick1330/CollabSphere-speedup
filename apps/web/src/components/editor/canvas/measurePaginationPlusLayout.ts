import type { Editor } from "@tiptap/react";

/**
 * Page count from PaginationPlus decoration DOM only (no scrollHeight inflation).
 */
export function resolvePaginationPlusPageCount(editor: Editor | null): number {
  if (!editor || editor.isDestroyed) return 1;

  const pagination = editor.view?.dom?.querySelector("[data-rm-pagination]");
  if (!pagination) return 1;

  return Math.max(1, pagination.children.length);
}

/** @deprecated Sheet stack removed; kept for tests that import parseMinHeightPx */
export function parseMinHeightPx(minHeight: string): number {
  if (!minHeight || minHeight === "auto") return 0;
  const match = minHeight.match(/calc\(([\d.]+)px/i) ?? minHeight.match(/^([\d.]+)px$/);
  if (!match) return 0;
  const parsed = Number.parseFloat(match[1]);
  return Number.isNaN(parsed) ? 0 : parsed;
}
