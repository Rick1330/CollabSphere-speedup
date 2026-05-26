import type { Editor } from "@tiptap/react";

export type EditorMetaEvent = "update" | "transaction" | "selectionUpdate";

export interface SubscribeEditorMetaOptions {
  debounceMs?: number;
  events?: EditorMetaEvent[];
  /** When true, `transaction` handlers run only if `tr.docChanged`. */
  docChangedOnly?: boolean;
}

/**
 * Coalesce TipTap editor side effects (debounce + optional docChanged filter).
 */
export function subscribeEditorMeta(
  editor: Editor,
  handler: () => void,
  opts: SubscribeEditorMetaOptions = {},
): () => void {
  const {
    debounceMs = 0,
    events = ["update", "transaction"],
    docChangedOnly = false,
  } = opts;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (debounceMs > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!editor.isDestroyed) handler();
      }, debounceMs);
      return;
    }
    if (!editor.isDestroyed) handler();
  };

  const onTransaction = () => {
    if (docChangedOnly && !editor.state.tr.docChanged) return;
    run();
  };

  const listeners: Array<{ event: EditorMetaEvent; fn: () => void }> = [];
  for (const event of events) {
    const fn = event === "transaction" ? onTransaction : run;
    editor.on(event, fn);
    listeners.push({ event, fn });
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    for (const { event, fn } of listeners) {
      editor.off(event, fn);
    }
  };
}

/** Double rAF so layout (e.g. PaginationPlus) has settled before measuring DOM. */
export function scheduleAfterLayout(fn: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
