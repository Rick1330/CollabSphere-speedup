import { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { buildVersionPreviewExtensions } from "@/features/documents/lib/build-version-preview-extensions";
import { loadYdocFromState } from "@/features/documents/lib/version-diff/load-ydoc-from-state";

/** Build a ProseMirror doc from a Yjs snapshot (destroys temp editor on cleanup). */
export function createPmDocFromYjsState(yjsState: Uint8Array): {
  doc: PmNode;
  destroy: () => void;
} {
  const ydoc = loadYdocFromState(yjsState);
  const editor = new Editor({
    extensions: buildVersionPreviewExtensions(ydoc),
    editable: false,
  });
  const doc = editor.state.doc;
  return {
    doc,
    destroy: () => {
      editor.destroy();
      ydoc.destroy();
    },
  };
}
