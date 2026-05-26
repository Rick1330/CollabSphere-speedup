import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  getPageContentBox,
  PAGE_GAP_PX,
  type PageSetup,
} from "./pageSetup";
import { DEFAULT_PAGE_FOOTER_TEMPLATE } from "./paginationPlusConfig";
import { resolvePaginationPlusPageCount } from "./measurePaginationPlusLayout";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import {
  scheduleAfterLayout,
  subscribeEditorMeta,
} from "@/features/documents/lib/editor-event-scheduler";

export function countPaginationPlusPages(editor: Editor | null): number {
  return resolvePaginationPlusPageCount(editor);
}

export function syncPageDimensions(editor: Editor, pageSetup: PageSetup): void {
  const { pageWidth, pageHeight } = getPageContentBox(pageSetup);
  const { margins } = pageSetup;

  const payload = {
    pageHeight,
    pageWidth,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
  };

  if (import.meta.env.DEV) {
    console.debug("[pagination] updatePageSize", payload);
  }

  editor.commands.updatePageSize(payload);
  editor
    .chain()
    .updatePageGap(PAGE_GAP_PX)
    .updatePageBreakBackground("#f1f3f4")
    .updateContentMargins({ top: 8, bottom: 8 })
    .run();
}

/** Default centered page number in footer band (no per-page localStorage HTML yet). */
function syncDefaultHeaderFooter(editor: Editor): void {
  editor.commands.updateHeaderContent("", "");
  editor.commands.updateFooterContent(DEFAULT_PAGE_FOOTER_TEMPLATE, "");
}

function publishPaginationMeta(
  editor: Editor,
  setPaginationMeta: ReturnType<typeof useEditorStore.getState>["setPaginationMeta"],
): void {
  scheduleAfterLayout(() => {
    if (editor.isDestroyed) return;
    const pageCount = resolvePaginationPlusPageCount(editor);
    setPaginationMeta(pageCount, [0]);
  });
}

export function usePaginationPlusSync(
  editor: Editor | null,
  pageSetup: PageSetup,
  enabled = true,
): void {
  const setPaginationMeta = useEditorStore((s) => s.setPaginationMeta);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !enabled) return;

    syncPageDimensions(editor, pageSetup);
    syncDefaultHeaderFooter(editor);
    publishPaginationMeta(editor, setPaginationMeta);
  }, [editor, enabled, pageSetup, setPaginationMeta]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !enabled) return;

    const publishMeta = () => publishPaginationMeta(editor, setPaginationMeta);

    const unsubscribe = subscribeEditorMeta(editor, publishMeta, {
      debounceMs: 50,
      events: ["update", "transaction"],
      docChangedOnly: true,
    });

    return unsubscribe;
  }, [editor, enabled, setPaginationMeta]);
}
