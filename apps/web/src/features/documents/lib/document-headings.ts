import type { Editor } from "@tiptap/react";
import { getEditorScrollContainer } from "@/features/documents/lib/editor-scroll-container";
import {
  assignHeadingAnchorIds,
  slugifyHeadingText,
  toHeadingDomId,
} from "@/features/documents/lib/document-heading-slugs";

export type DocumentHeading = {
  pos: number;
  level: number;
  text: string;
  anchorId: string;
};

export { assignHeadingAnchorIds, slugifyHeadingText, toHeadingDomId };

export function collectDocumentHeadings(editor: Editor | null): DocumentHeading[] {
  if (!editor || editor.isDestroyed) return [];
  const raw: { pos: number; level: number; text: string; anchorId: string | null }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    raw.push({
      pos,
      level: Number(node.attrs.level) || 1,
      text: node.textContent.trim(),
      anchorId: (node.attrs.anchorId as string | null) ?? null,
    });
  });
  const texts = raw.map((h) => h.text);
  const generated = assignHeadingAnchorIds(texts);
  return raw.map((h, index) => ({
    pos: h.pos,
    level: h.level,
    text: h.text,
    anchorId: h.anchorId ?? generated[index] ?? `section-${index + 1}`,
  }));
}

function findEditorScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) return node;
    if (node.classList.contains("cs-paginated-canvas-outer")) return node;
    node = node.parentElement;
  }
  return null;
}

function scrollElementIntoScroller(
  target: HTMLElement,
  scroller: HTMLElement | null,
): void {
  if (scroller) {
    const elRect = target.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    scroller.scrollTo({
      top: scroller.scrollTop + elRect.top - scRect.top - scroller.clientHeight * 0.2,
      behavior: "smooth",
    });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function flashHeadingElement(el: HTMLElement): void {
  el.classList.add("cs-heading-anchor--flash");
  window.setTimeout(() => el.classList.remove("cs-heading-anchor--flash"), 1300);
}

/** Scroll to a heading by ProseMirror document position (pagination-safe). */
export function scrollToHeadingPos(
  editor: Editor,
  pos: number,
  scrollContainer?: HTMLElement | null,
): boolean {
  if (editor.isDestroyed) return false;
  const clamped = Math.max(0, Math.min(pos, editor.state.doc.content.size));
  const coords = editor.view.coordsAtPos(clamped);
  const scroller =
    scrollContainer ?? getEditorScrollContainer() ?? findEditorScrollParent(editor.view.dom);

  if (scroller) {
    const scRect = scroller.getBoundingClientRect();
    scroller.scrollTo({
      top: scroller.scrollTop + coords.top - scRect.top - scroller.clientHeight * 0.2,
      behavior: "smooth",
    });
  } else {
    const domAt = editor.view.domAtPos(clamped);
    const el =
      domAt.node instanceof HTMLElement ? domAt.node : (domAt.node.parentElement as HTMLElement | null);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const domAt = editor.view.domAtPos(clamped);
  const el =
    domAt.node instanceof HTMLElement ? domAt.node : (domAt.node.parentElement as HTMLElement | null);
  if (el?.tagName.match(/^H[1-6]$/i)) {
    flashHeadingElement(el);
  }

  return true;
}

export function scrollToHeadingAnchor(
  editor: Editor,
  anchorId: string,
  scrollContainer?: HTMLElement | null,
  fallbackPos?: number,
): boolean {
  const domId = toHeadingDomId(anchorId);
  const matches = editor.view.dom.querySelectorAll<HTMLElement>(`#${CSS.escape(domId)}`);
  const el = matches.length === 1 ? matches[0] : matches[0] ?? null;

  if (el) {
    const scroller = scrollContainer ?? getEditorScrollContainer() ?? findEditorScrollParent(el);
    scrollElementIntoScroller(el, scroller);
    flashHeadingElement(el);
    return true;
  }

  if (fallbackPos != null) {
    return scrollToHeadingPos(editor, fallbackPos, scrollContainer);
  }

  return false;
}
