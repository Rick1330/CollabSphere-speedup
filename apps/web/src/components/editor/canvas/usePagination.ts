import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { Plugin } from "@tiptap/pm/state";
import { DEFAULT_PAGE_SETUP, type PageSetup } from "./pageSetup";
import {
  createPaginationPlugin,
  PAGINATION_PLUGIN_KEY,
  type PageMeasureResult,
} from "./pagination/paginationPlugin";
import {
  createFocusParagraphPlugin,
  FOCUS_PARAGRAPH_PLUGIN_KEY,
} from "./pagination/focusParagraphPlugin";

export interface UsePaginationOptions {
  pageSetup?: PageSetup;
  enabled?: boolean;
  showPageBreaks?: boolean;
  focusMode?: boolean;
  onMeasureChange?: (measure: PageMeasureResult) => void;
}

function installPlugin(editor: Editor, plugin: Plugin): void {
  const view = editor.view;
  if (!view || view.isDestroyed) return;
  const key = plugin.spec.key;
  view.updateState(
    view.state.reconfigure({
      plugins: [
        ...view.state.plugins.filter((p) => p.spec.key !== key),
        plugin,
      ],
    }),
  );
}

function removePlugin(editor: Editor, key: typeof PAGINATION_PLUGIN_KEY): void {
  if (editor.isDestroyed) return;
  const view = editor.view;
  if (!view || view.isDestroyed) return;
  try {
    view.updateState(
      view.state.reconfigure({
        plugins: view.state.plugins.filter((p) => p.spec.key !== key),
      }),
    );
  } catch {
    // view tearing down
  }
}

/**
 * @deprecated Approach A — disabled; pagination uses `tiptap-pagination-plus` in
 * `buildEditorExtensions`. Use `usePaginationPlusSync` + `useFocusParagraph` instead.
 * Kept for rollback only.
 */
export function usePagination(
  editor: Editor | null,
  {
    pageSetup = DEFAULT_PAGE_SETUP,
    enabled = true,
    showPageBreaks = false,
    focusMode = false,
    onMeasureChange,
  }: UsePaginationOptions = {},
): void {
  const onMeasureChangeRef = useRef(onMeasureChange);
  onMeasureChangeRef.current = onMeasureChange;

  useEffect(() => {
    if (!editor || editor.isDestroyed || !enabled) return;

    const getView = () => (editor.isDestroyed ? null : editor.view);

    const paginationPlugin = createPaginationPlugin({
      pageSetup,
      showPageBreaks,
      enabled,
      getView,
    });
    const focusPlugin = createFocusParagraphPlugin(focusMode, getView);

    installPlugin(editor, paginationPlugin);
    installPlugin(editor, focusPlugin);

    const notify = () => {
      const state = PAGINATION_PLUGIN_KEY.getState(editor.state) as
        | { measure: PageMeasureResult }
        | undefined;
      if (state?.measure) onMeasureChangeRef.current?.(state.measure);
    };

    notify();
    editor.on("transaction", notify);

    return () => {
      editor.off("transaction", notify);
      removePlugin(editor, PAGINATION_PLUGIN_KEY);
      removePlugin(editor, FOCUS_PARAGRAPH_PLUGIN_KEY);
    };
  }, [editor, enabled, pageSetup, showPageBreaks, focusMode]);
}
