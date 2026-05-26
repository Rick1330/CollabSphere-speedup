import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

export function readApproximatePageCount(editor: Editor | null): number {
  if (!editor || editor.isDestroyed) return 1;
  let h1Count = 0;
  editor.state.doc.forEach((node) => {
    if (node.type.name === "heading" && node.attrs.level === 1) {
      h1Count += 1;
    }
  });
  return h1Count + 1;
}

export function useApproximatePageCount(editor: Editor | null): number {
  const [pageCount, setPageCount] = useState(() => readApproximatePageCount(editor));

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const update = () => setPageCount(readApproximatePageCount(editor));
    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  return pageCount;
}
