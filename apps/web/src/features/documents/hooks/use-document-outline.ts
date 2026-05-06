/**
 * useDocumentOutline
 *
 * Subscribes to the editor and emits an ordered tree of headings derived
 * from the live ProseMirror document. Used by the right-rail outline
 * panel for in-document navigation, and as input to the readiness panel
 * (so it can show progress against the contract while the user types).
 *
 * Design notes
 * ------------
 *  - We DON'T read the heading id from a markup attribute; we generate a
 *    stable slug per render and add it as a `data-outline-id` attribute on
 *    the rendered DOM via the editor's HeadingView is unnecessary — instead
 *    we map by ProseMirror `pos`, which is stable for the lifetime of the
 *    transaction and updates atomically.
 *  - Slugs are content-derived for keyboard-accessible jump targets and
 *    deduped with `-2`, `-3` suffixes (Notion-style).
 *  - The hook intentionally throttles to `requestAnimationFrame` cadence
 *    so a 50-page document doesn't re-walk on every keystroke.
 */
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

export interface OutlineNode {
  id: string;
  /** 1..6 */
  level: number;
  text: string;
  /** ProseMirror position of the heading node — pass to `editor.commands.setTextSelection` then scroll. */
  pos: number;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "section"
  );
}

function collectHeadings(editor: Editor): OutlineNode[] {
  const seen = new Map<string, number>();
  const out: OutlineNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return undefined;
    const text = node.textContent.trim();
    if (text.length === 0) {
      // Still surface empty headings so the user can see "(empty)" placeholders.
      out.push({ id: `empty-${pos}`, level: node.attrs.level, text: "", pos });
      return false;
    }
    const base = slugify(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({
      id: n === 1 ? base : `${base}-${n}`,
      level: node.attrs.level,
      text,
      pos,
    });
    return false;
  });
  return out;
}

export function useDocumentOutline(editor: Editor | null): OutlineNode[] {
  const [outline, setOutline] = useState<OutlineNode[]>([]);

  useEffect(() => {
    if (!editor) {
      setOutline([]);
      return;
    }
    let frame = 0;
    const recompute = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setOutline(collectHeadings(editor));
      });
    };
    recompute();
    editor.on("update", recompute);
    editor.on("transaction", recompute);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("update", recompute);
      editor.off("transaction", recompute);
    };
  }, [editor]);

  return outline;
}

/**
 * Scroll the editor viewport to a heading by ProseMirror position.
 * Caller is responsible for finding the scroll container — we resolve the
 * DOM node, then call `scrollIntoView` with `block: 'start'`.
 */
export function scrollToOutlineNode(editor: Editor, pos: number) {
  try {
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
    if (dom && typeof dom.scrollIntoView === "function") {
      dom.scrollIntoView({ behavior: "smooth", block: "start" });
      // Optional: place caret at the heading
      editor.commands.setTextSelection(pos + 1);
    }
  } catch {
    // pos may have been invalidated mid-transaction; no-op is safe
  }
}
