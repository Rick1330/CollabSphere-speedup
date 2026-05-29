import type { Editor } from "@tiptap/react";
import {
  DEFAULT_PAGE_SETUP,
  getPageContentBox,
  PAGE_GAP_PX,
  type PageSetup,
} from "@/components/editor/canvas/pageSetup";

export const PRINT_ROOT_ID = "cs-print-root";
export const PRINT_PAGE_START_CLASS = "cs-print-page-start";

const PRINT_SKIP_SELECTOR =
  "[data-rm-pagination], .rm-first-page-header, .rm-pages-wrapper, .rm-br-decoration";

export type PrintableBlockWithPos = {
  el: HTMLElement;
  pos: number;
};

type PageBand = {
  page: number;
  top: number;
  bottom: number;
};

export function getPaginationRoot(editor: Editor | null): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null;
  const dom = editor.view?.dom;
  if (!dom) return null;
  return (
    dom.querySelector<HTMLElement>("[data-rm-pagination]") ??
    dom.querySelector<HTMLElement>("#pages")
  );
}

export function listPaginationPageBreakElements(editor: Editor | null): HTMLElement[] {
  const root = getPaginationRoot(editor);
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(":scope > .rm-page-break"));
}

export function resolveProseMirrorRoot(editor: Editor | null): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null;
  return editor.view?.dom ?? null;
}

/** @deprecated Prefer resolveProseMirrorRoot for page geometry. */
export function resolveWritingColumn(editor: Editor | null): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null;
  const dom = editor.view?.dom;
  if (!dom) return null;
  return (
    dom.closest<HTMLElement>(".cs-paginated-writing-column") ??
    dom.closest<HTMLElement>(".ProseMirror") ??
    dom
  );
}

function shouldSkipPrintBlock(el: HTMLElement): boolean {
  if (el.matches(PRINT_SKIP_SELECTOR)) return true;
  if (el.closest("[data-rm-pagination]")) return true;
  if (el.closest(".rm-first-page-header")) return true;
  return false;
}

function getPageBands(editor: Editor | null): PageBand[] {
  return listPaginationPageBreakElements(editor).map((pageBreak, index) => {
    const rect = pageBreak.getBoundingClientRect();
    return {
      page: index + 1,
      top: rect.top,
      bottom: rect.bottom,
    };
  });
}

function bandsAreUsable(bands: PageBand[]): boolean {
  if (bands.length <= 1) return bands.length === 1;
  for (let i = 1; i < bands.length; i += 1) {
    if (bands[i].top <= bands[i - 1].top + 4) return false;
  }
  const span = bands[bands.length - 1].top - bands[0].top;
  return span >= 50;
}

function resolveFromBands(clientY: number, bands: PageBand[]): number | null {
  for (const band of bands) {
    if (clientY >= band.top - 2 && clientY <= band.bottom + 2) {
      return band.page;
    }
  }
  for (let i = bands.length - 1; i >= 0; i -= 1) {
    if (clientY >= bands[i].top - 2) {
      return bands[i].page;
    }
  }
  return null;
}

function resolveFromGrid(
  editor: Editor,
  clientY: number,
  pageSetup: PageSetup,
): number {
  const pageCount = Math.max(1, listPaginationPageBreakElements(editor).length);
  const { pageHeight } = getPageContentBox(pageSetup);
  const stride = pageHeight + PAGE_GAP_PX;
  const prose = editor.view.dom;
  const header = prose.querySelector<HTMLElement>(".rm-first-page-header");

  let contentStartY: number;
  try {
    contentStartY = header
      ? header.getBoundingClientRect().bottom
      : editor.view.coordsAtPos(1).top;
  } catch {
    contentStartY = prose.getBoundingClientRect().top;
  }

  const relative = clientY - contentStartY;
  if (relative < 0) return 1;
  const page = Math.floor(relative / stride) + 1;
  return Math.min(pageCount, Math.max(1, page));
}

function clampDocPos(editor: Editor, pos: number): number {
  return Math.max(1, Math.min(pos, editor.state.doc.content.size - 1));
}

/** Page number (1-based) from a ProseMirror document position (pagination-safe). */
export function resolvePageNumberAtPos(
  editor: Editor | null,
  pos: number,
  pageSetup: PageSetup = DEFAULT_PAGE_SETUP,
): number {
  if (!editor || editor.isDestroyed) return 1;

  const clamped = clampDocPos(editor, pos);
  let clientY: number;
  try {
    clientY = editor.view.coordsAtPos(clamped).top;
  } catch {
    return 1;
  }

  const bands = getPageBands(editor);
  if (bandsAreUsable(bands)) {
    const fromBands = resolveFromBands(clientY, bands);
    if (fromBands != null) return fromBands;
  }

  return resolveFromGrid(editor, clientY, pageSetup);
}

/** Page number (1-based) for a viewport Y coordinate. */
export function resolvePageNumberAtY(
  editor: Editor | null,
  clientY: number,
  pageSetup: PageSetup = DEFAULT_PAGE_SETUP,
): number {
  if (!editor || editor.isDestroyed) return 1;

  const bands = getPageBands(editor);
  if (bandsAreUsable(bands)) {
    const fromBands = resolveFromBands(clientY, bands);
    if (fromBands != null) return fromBands;
  }

  return resolveFromGrid(editor, clientY, pageSetup);
}

export function resolveElementPageNumber(
  editor: Editor | null,
  element: HTMLElement,
  pageSetup: PageSetup = DEFAULT_PAGE_SETUP,
): number {
  if (!editor || editor.isDestroyed) return 1;

  const view = editor.view;
  try {
    const pos = view.posAtDOM(element, 0);
    if (typeof pos === "number" && pos >= 0) {
      return resolvePageNumberAtPos(editor, pos + 1, pageSetup);
    }
  } catch {
    // fall through to Y-based resolution
  }

  return resolvePageNumberAtY(editor, element.getBoundingClientRect().top, pageSetup);
}

/** Top-level document blocks with ProseMirror positions for print grouping. */
export function collectPrintableBlocksWithPos(editor: Editor | null): PrintableBlockWithPos[] {
  if (!editor || editor.isDestroyed) return [];

  const view = editor.view;
  const blocks: PrintableBlockWithPos[] = [];

  editor.state.doc.forEach((node, offset) => {
    if (!node.isBlock) return;

    const pos = offset + 1;
    const nodeDom = view.nodeDOM(offset);
    let el: HTMLElement | null = null;

    if (nodeDom instanceof HTMLElement) {
      el = nodeDom;
    } else if (nodeDom instanceof Text) {
      el = nodeDom.parentElement;
    } else if (nodeDom && "parentElement" in nodeDom) {
      el = (nodeDom as Node).parentElement;
    }

    if (!el) {
      const domAt = view.domAtPos(pos);
      el =
        domAt.node instanceof HTMLElement
          ? domAt.node
          : domAt.node.parentElement;
    }

    if (!el || shouldSkipPrintBlock(el)) return;
    blocks.push({ el, pos });
  });

  return blocks;
}

function sanitizePrintClone(clone: HTMLElement): void {
  clone
    .querySelectorAll(
      ".block-canvas-toolbar, .collaboration-cursor, button, textarea",
    )
    .forEach((node) => {
      if (node instanceof HTMLElement && node.closest(".toc-block nav")) return;
      node.remove();
    });
}

function applyPrintPageShellStyles(
  pageEl: HTMLElement,
  pageSetup: PageSetup,
  isLastPage: boolean,
): void {
  const { pageWidth, pageHeight } = getPageContentBox(pageSetup);
  pageEl.style.width = `${pageWidth}px`;
  pageEl.style.minHeight = `${pageHeight}px`;
  pageEl.style.boxSizing = "border-box";
  pageEl.style.marginLeft = "auto";
  pageEl.style.marginRight = "auto";
  if (!isLastPage) {
    pageEl.style.pageBreakAfter = "always";
    pageEl.style.breakAfter = "page";
  }
}

/** Group top-level blocks into explicit print page shells. */
export function buildExplicitPrintRoot(
  editor: Editor,
  pageSetup: PageSetup,
): HTMLElement {
  removeExplicitPrintRoot();

  const pageCount = Math.max(1, listPaginationPageBreakElements(editor).length);
  const grouped = new Map<number, PrintableBlockWithPos[]>();

  for (const block of collectPrintableBlocksWithPos(editor)) {
    const page = resolvePageNumberAtPos(editor, block.pos, pageSetup);
    const list = grouped.get(page) ?? [];
    list.push(block);
    grouped.set(page, list);
  }

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.className = "tiptap ProseMirror cs-print-root-inner";

  for (let page = 1; page <= pageCount; page += 1) {
    const pageEl = document.createElement("div");
    pageEl.className = "cs-print-page";
    pageEl.dataset.page = String(page);
    applyPrintPageShellStyles(pageEl, pageSetup, page === pageCount);

    const pageBlocks = grouped.get(page) ?? [];
    for (const { el } of pageBlocks) {
      const clone = el.cloneNode(true) as HTMLElement;
      sanitizePrintClone(clone);
      pageEl.appendChild(clone);
    }

    root.appendChild(pageEl);
  }

  document.body.appendChild(root);
  return root;
}

export function removeExplicitPrintRoot(): void {
  document.getElementById(PRINT_ROOT_ID)?.remove();
}
