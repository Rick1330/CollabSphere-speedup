/**
 * useDocumentReadiness
 *
 * Editor-aware wrapper around `computeReadiness` from template-schema.
 * Re-runs on editor updates with a small debounce so a long document
 * doesn't recompute on every keystroke.
 */
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  computeReadiness,
  type DocumentReadiness,
  type TemplateContract,
} from "@/features/documents/template-schema";

export function useDocumentReadiness(
  editor: Editor | null,
  contract: TemplateContract | null,
): DocumentReadiness | null {
  const [readiness, setReadiness] = useState<DocumentReadiness | null>(() =>
    computeReadiness(editor, contract),
  );

  useEffect(() => {
    if (!contract) {
      setReadiness(null);
      return;
    }
    if (!editor) {
      setReadiness(computeReadiness(null, contract));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const recompute = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setReadiness(computeReadiness(editor, contract));
      }, 250);
    };
    recompute();
    editor.on("update", recompute);
    return () => {
      if (timer) clearTimeout(timer);
      editor.off("update", recompute);
    };
  }, [editor, contract]);

  return readiness;
}
