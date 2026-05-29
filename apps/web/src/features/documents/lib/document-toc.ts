import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import type { PageSetup } from "@/components/editor/canvas/pageSetup";
import type { DocumentHeading } from "@/features/documents/lib/document-headings";
import { toHeadingDomId } from "@/features/documents/lib/document-heading-slugs";
import { resolvePageNumberAtPos } from "@/components/editor/canvas/pagination-dom";

const TABLE_NODE_NAMES = new Set(["table", "tableRow", "tableCell", "tableHeader"]);

/**
 * Resolve a document position where a top-level block (e.g. tocBlock) can be inserted.
 * Moves insertion after tables when the saved cursor was inside a cell.
 */
export function resolveBlockInsertPos(state: EditorState, pos: number): number {
  const doc = state.doc;
  const clamped = Math.max(0, Math.min(pos, doc.content.size));
  const $pos = doc.resolve(clamped);

  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "table") {
      return $pos.after(d);
    }
    if (TABLE_NODE_NAMES.has($pos.node(d).type.name)) {
      for (let t = d; t > 0; t--) {
        if ($pos.node(t).type.name === "table") {
          return $pos.after(t);
        }
      }
    }
  }

  if ($pos.depth > 0 && $pos.parent.isBlock) {
    return $pos.before($pos.depth);
  }

  return clamped;
}

export type TocStyle = "indented" | "numbered" | "flat";

export type TocEntry = DocumentHeading & {
  label: string;
  prefix: string;
  pageNumber: number | null;
};

const PAGINATION_IDLE_MS = 120;

let paginationIdleTimer: ReturnType<typeof setTimeout> | null = null;
let paginationIdleResolvers: Array<() => void> = [];

/** Wait until pagination DOM has settled (strict-sync for page numbers). */
export function waitForPaginationIdle(): Promise<void> {
  return new Promise((resolve) => {
    paginationIdleResolvers.push(resolve);
    if (paginationIdleTimer != null) {
      clearTimeout(paginationIdleTimer);
    }
    paginationIdleTimer = setTimeout(() => {
      paginationIdleTimer = null;
      const resolvers = paginationIdleResolvers;
      paginationIdleResolvers = [];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolvers.forEach((r) => r());
        });
      });
    }, PAGINATION_IDLE_MS);
  });
}

export function resolveHeadingPageNumber(
  editor: Editor,
  anchorId: string,
  pageSetup?: PageSetup,
  headingPos?: number,
): number | null {
  if (editor.isDestroyed) return null;

  if (typeof headingPos === "number") {
    return resolvePageNumberAtPos(editor, headingPos + 1, pageSetup);
  }

  const domId = toHeadingDomId(anchorId);
  const headingEl = editor.view.dom.querySelector<HTMLElement>(`#${CSS.escape(domId)}`);
  if (!headingEl) return null;

  try {
    const pos = editor.view.posAtDOM(headingEl, 0);
    return resolvePageNumberAtPos(editor, pos + 1, pageSetup);
  } catch {
    return null;
  }
}

export function buildTocNumbering(
  headings: DocumentHeading[],
  includedLevels: number[],
): Map<string, string> {
  const counters = [0, 0, 0, 0, 0, 0];
  const prefixes = new Map<string, string>();

  for (const heading of headings) {
    if (!includedLevels.includes(heading.level)) continue;
    const idx = heading.level - 1;
    counters[idx] += 1;
    for (let i = idx + 1; i < 6; i += 1) {
      counters[i] = 0;
    }
    const parts = counters.slice(0, idx + 1).filter((n) => n > 0);
    prefixes.set(heading.anchorId, parts.join("."));
  }

  return prefixes;
}

export function buildTocEntries(
  headings: DocumentHeading[],
  options: {
    includedLevels: number[];
    style: TocStyle;
    showPageNumbers: boolean;
    editor: Editor | null;
    pageSetup?: PageSetup;
  },
): TocEntry[] {
  const { includedLevels, style, showPageNumbers, editor, pageSetup } = options;
  const filtered = headings.filter((h) => includedLevels.includes(h.level));

  const prefixes =
    style === "numbered" ? buildTocNumbering(filtered, includedLevels) : new Map<string, string>();

  return filtered.map((heading) => {
    const prefix = prefixes.get(heading.anchorId) ?? "";
    let label = heading.text || "(Untitled heading)";
    if (style === "numbered" && prefix) {
      label = `${prefix} ${label}`;
    }
    const pageNumber =
      showPageNumbers && editor && !editor.isDestroyed
        ? resolveHeadingPageNumber(editor, heading.anchorId, pageSetup, heading.pos)
        : null;

    return {
      ...heading,
      label,
      prefix,
      pageNumber,
    };
  });
}

export const DEFAULT_TOC_INCLUDED_LEVELS = [1, 2, 3];

export const DEFAULT_TOC_OPTIONS = {
  includedLevels: DEFAULT_TOC_INCLUDED_LEVELS,
  style: "indented" as TocStyle,
  showPageNumbers: true,
  clickableLinks: true,
};
