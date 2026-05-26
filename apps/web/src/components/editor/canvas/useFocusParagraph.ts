import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Plugin } from "@tiptap/pm/state";
import {
  createFocusParagraphPlugin,
  FOCUS_PARAGRAPH_PLUGIN_KEY,
} from "./pagination/focusParagraphPlugin";

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

function removePlugin(editor: Editor, key: typeof FOCUS_PARAGRAPH_PLUGIN_KEY): void {
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

/** Focus-mode paragraph dimming only (pagination handled by PaginationPlus). */
export function useFocusParagraph(editor: Editor | null, focusMode: boolean): void {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const getView = () => (editor.isDestroyed ? null : editor.view);
    const focusPlugin = createFocusParagraphPlugin(focusMode, getView);

    installPlugin(editor, focusPlugin);

    return () => {
      removePlugin(editor, FOCUS_PARAGRAPH_PLUGIN_KEY);
    };
  }, [editor, focusMode]);
}
