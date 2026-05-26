import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import { readApproximatePageCount } from "@/features/documents/hooks/use-approximate-page-count";
import { subscribeEditorMeta } from "@/features/documents/lib/editor-event-scheduler";

function currentPageFromDom(editor: Editor, totalPages: number): number {
  const view = editor.view;
  if (!view?.dom || totalPages < 1) return 1;

  const pagination = view.dom.querySelector("[data-rm-pagination]");
  if (!pagination) return 1;

  const selectionTop = view.coordsAtPos(editor.state.selection.from).top;
  const pages = Array.from(pagination.children) as HTMLElement[];

  for (let i = pages.length - 1; i >= 0; i -= 1) {
    const rect = pages[i].getBoundingClientRect();
    if (selectionTop >= rect.top - 2) {
      return i + 1;
    }
  }

  return 1;
}

function formatLabel(editor: Editor, storeCount: number): string {
  const pagination = editor.view.dom.querySelector("[data-rm-pagination]");
  if (pagination) {
    const total = Math.max(1, storeCount);
    const current = currentPageFromDom(editor, total);
    return total === 1 ? "Page 1 of 1" : `Page ${current} of ${total}`;
  }
  const approx = readApproximatePageCount(editor);
  return approx === 1 ? "Page ~1" : `Page ~${approx}`;
}

export function usePaginationPageLabel(editor: Editor | null): string {
  const storeCount = useEditorStore((s) => s.paginationPageCount);
  const [label, setLabel] = useState("Page 1 of 1");

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      setLabel("Page 1 of 1");
      return;
    }

    const update = () => {
      setLabel(formatLabel(editor, storeCount));
    };

    update();

    const unsubSelection = subscribeEditorMeta(editor, update, {
      debounceMs: 100,
      events: ["selectionUpdate"],
    });

    const unsubStore = subscribeEditorMeta(editor, update, {
      debounceMs: 100,
      events: ["update"],
      docChangedOnly: true,
    });

    return () => {
      unsubSelection();
      unsubStore();
    };
  }, [editor, storeCount]);

  return label;
}
