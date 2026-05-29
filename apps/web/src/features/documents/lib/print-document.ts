import type { Editor } from "@tiptap/react";
import type { PageSetup } from "@/components/editor/canvas/pageSetup";
import { getPageContentBox } from "@/components/editor/canvas/pageSetup";
import { resolvePaginationPlusPageCount } from "@/components/editor/canvas/measurePaginationPlusLayout";
import {
  buildExplicitPrintRoot,
  removeExplicitPrintRoot,
} from "@/components/editor/canvas/pagination-dom";
import { waitForPaginationIdle } from "@/features/documents/lib/document-toc";
import { getEditorScrollContainer } from "@/features/documents/lib/editor-scroll-container";

const PRINT_BODY_CLASS = "cs-editor-printing";
const PRINT_RUNTIME_STYLE_ID = "cs-print-runtime-styles";

const PRINT_RUNTIME_CSS = `
#cs-print-root { display: none; }
@media print {
  body.cs-editor-printing #root { display: none !important; }
  body.cs-editor-printing #cs-print-root { display: block !important; }
  #cs-print-root .cs-print-page {
    break-after: page;
    page-break-after: always;
    width: var(--print-page-width);
    min-height: var(--print-page-height);
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
  }
  #cs-print-root .cs-print-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  @page {
    size: var(--print-page-size, A4 portrait);
    margin: var(--print-page-margin-top, 96px) var(--print-page-margin-right, 96px)
      var(--print-page-margin-bottom, 96px) var(--print-page-margin-left, 96px);
  }
}
`;

type ClippingSnapshot = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
  height: string;
  maxHeight: string;
  minHeight: string;
  position: string;
  transform: string;
};

let clippingSnapshots: ClippingSnapshot[] | null = null;

function needsUnclip(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflow = style.overflow + style.overflowY + style.overflowX;
  if (/auto|scroll|hidden|clip/.test(overflow)) return true;
  if (style.height !== "auto" && style.height !== "" && !style.height.endsWith("%")) return true;
  if (style.maxHeight !== "none" && style.maxHeight !== "") return true;
  if (style.minHeight !== "0px" && style.minHeight !== "auto" && style.minHeight !== "") {
    return true;
  }
  if (style.position === "fixed" || style.position === "sticky") return true;
  if (style.transform && style.transform !== "none") return true;
  return false;
}

/** Walk ancestors and force overflow/height visible so layout can be measured before print. */
export function releaseLayoutClippingForPrint(anchor: HTMLElement): void {
  restoreLayoutClipping();
  const snapshots: ClippingSnapshot[] = [];
  let node: HTMLElement | null = anchor;

  while (node && node !== document.documentElement) {
    if (needsUnclip(node)) {
      snapshots.push({
        el: node,
        overflow: node.style.overflow,
        overflowX: node.style.overflowX,
        overflowY: node.style.overflowY,
        height: node.style.height,
        maxHeight: node.style.maxHeight,
        minHeight: node.style.minHeight,
        position: node.style.position,
        transform: node.style.transform,
      });
      node.style.setProperty("overflow", "visible", "important");
      node.style.setProperty("overflow-x", "visible", "important");
      node.style.setProperty("overflow-y", "visible", "important");
      node.style.setProperty("height", "auto", "important");
      node.style.setProperty("max-height", "none", "important");
      node.style.setProperty("min-height", "0", "important");
      if (propIsFixedOrSticky(node)) {
        node.style.setProperty("position", "static", "important");
      }
      if (node.classList.contains("cs-paginated-scale-wrap")) {
        node.style.setProperty("transform", "none", "important");
      }
    }
    node = node.parentElement;
  }

  clippingSnapshots = snapshots;
}

function propIsFixedOrSticky(el: HTMLElement): boolean {
  const pos = window.getComputedStyle(el).position;
  return pos === "fixed" || pos === "sticky";
}

export function restoreLayoutClipping(): void {
  if (!clippingSnapshots) return;
  for (const snap of clippingSnapshots) {
    snap.el.style.overflow = snap.overflow;
    snap.el.style.overflowX = snap.overflowX;
    snap.el.style.overflowY = snap.overflowY;
    snap.el.style.height = snap.height;
    snap.el.style.maxHeight = snap.maxHeight;
    snap.el.style.minHeight = snap.minHeight;
    snap.el.style.position = snap.position;
    snap.el.style.transform = snap.transform;
  }
  clippingSnapshots = null;
}

export function applyPrintPageVariables(pageSetup: PageSetup): void {
  const { pageWidth, pageHeight, contentWidth } = getPageContentBox(pageSetup);
  const root = document.documentElement;
  root.style.setProperty("--print-page-width", `${pageWidth}px`);
  root.style.setProperty("--print-page-height", `${pageHeight}px`);
  root.style.setProperty("--print-content-width", `${contentWidth}px`);
  root.style.setProperty(
    "--print-page-margin-top",
    `${pageSetup.margins.top}px`,
  );
  root.style.setProperty(
    "--print-page-margin-right",
    `${pageSetup.margins.right}px`,
  );
  root.style.setProperty(
    "--print-page-margin-bottom",
    `${pageSetup.margins.bottom}px`,
  );
  root.style.setProperty(
    "--print-page-margin-left",
    `${pageSetup.margins.left}px`,
  );
  const pageSize =
    pageSetup.format === "a4"
      ? "A4"
      : pageSetup.format === "legal"
        ? "legal"
        : "letter";
  const orientation = pageSetup.orientation === "landscape" ? " landscape" : "";
  root.style.setProperty("--print-page-size", `${pageSize}${orientation}`);
}

export function clearPrintPageVariables(): void {
  const root = document.documentElement;
  for (const name of [
    "--print-page-width",
    "--print-page-height",
    "--print-content-width",
    "--print-page-margin-top",
    "--print-page-margin-right",
    "--print-page-margin-bottom",
    "--print-page-margin-left",
    "--print-page-size",
  ]) {
    root.style.removeProperty(name);
  }
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Wait for layout to settle after zoom or pagination changes before print. */
export async function waitPrintLayoutSettled(): Promise<void> {
  await waitForPaginationIdle();
  await waitFrames(2);
}

export function ensurePrintStylesheet(): void {
  removePrintStylesheet();
  const style = document.createElement("style");
  style.id = PRINT_RUNTIME_STYLE_ID;
  style.textContent = PRINT_RUNTIME_CSS;
  document.head.appendChild(style);
}

export function removePrintStylesheet(): void {
  document.getElementById(PRINT_RUNTIME_STYLE_ID)?.remove();
}

async function waitForPaginationReady(editor: Editor | null, timeoutMs = 2000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await waitForPaginationIdle();
    if (!editor || editor.isDestroyed) return;
    const count = resolvePaginationPlusPageCount(editor);
    const pagination = editor.view.dom.querySelector("[data-rm-pagination]");
    if (count >= 1 && pagination && pagination.children.length > 0) return;
    await new Promise((r) => setTimeout(r, 80));
  }
}

function resolvePrintAnchor(editor: Editor | null): HTMLElement | null {
  if (editor && !editor.isDestroyed) {
    const canvas = editor.view.dom.closest<HTMLElement>(".cs-paginated-canvas-outer");
    if (canvas) return canvas;
    return editor.view.dom;
  }
  return document.querySelector<HTMLElement>(".cs-paginated-canvas-outer");
}

/** Prepare paginated editor and build explicit multi-page print root. */
export async function prepareEditorForPrint(options?: {
  editor?: Editor | null;
  pageSetup?: PageSetup;
  scrollToTop?: boolean;
}): Promise<void> {
  await waitForPaginationReady(options?.editor ?? null);
  await waitFrames(2);

  if (options?.scrollToTop !== false) {
    const scroller = getEditorScrollContainer();
    if (scroller) {
      scroller.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }

  await waitFrames(1);

  const anchor = resolvePrintAnchor(options?.editor ?? null);
  if (anchor) {
    releaseLayoutClippingForPrint(anchor);
  }

  await waitForPaginationIdle();
  await waitFrames(1);

  const editor = options?.editor;
  if (editor && !editor.isDestroyed && options?.pageSetup) {
    buildExplicitPrintRoot(editor, options.pageSetup);
  }
}

export async function printEditorDocument(options: {
  pageSetup: PageSetup;
  editor?: Editor | null;
  onBeforePrint?: () => void | Promise<void>;
  onAfterPrint?: () => void;
}): Promise<void> {
  const { pageSetup, editor, onBeforePrint, onAfterPrint } = options;
  applyPrintPageVariables(pageSetup);
  ensurePrintStylesheet();
  await onBeforePrint?.();
  await prepareEditorForPrint({ editor, pageSetup });
  document.body.classList.add(PRINT_BODY_CLASS);

  const cleanup = () => {
    document.body.classList.remove(PRINT_BODY_CLASS);
    removeExplicitPrintRoot();
    removePrintStylesheet();
    restoreLayoutClipping();
    clearPrintPageVariables();
    onAfterPrint?.();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

export { buildExplicitPrintRoot, removeExplicitPrintRoot };
