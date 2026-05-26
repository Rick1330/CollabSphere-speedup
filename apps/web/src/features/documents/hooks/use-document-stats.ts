import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { readEditorCounts } from "@/features/documents/components/editor/editor-footer-utils";

export interface DocumentStats {
  words: number;
  characters: number;
  paragraphs: number;
  readingMinutes: number;
  headings: number;
  images: number;
  tables: number;
  links: number;
  codeBlocks: number;
}

function collectStats(editor: Editor): DocumentStats {
  const { words, chars } = readEditorCounts(editor);
  let paragraphs = 0;
  let headings = 0;
  let images = 0;
  let tables = 0;
  let links = 0;
  let codeBlocks = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name === "paragraph") paragraphs += 1;
    if (node.type.name === "heading") headings += 1;
    if (node.type.name === "image") images += 1;
    if (node.type.name === "table") tables += 1;
    if (node.type.name === "codeBlock") codeBlocks += 1;
    if (node.isText && node.marks.some((m) => m.type.name === "link")) {
      links += 1;
    }
    return undefined;
  });

  return {
    words,
    characters: chars,
    paragraphs,
    readingMinutes: words > 0 ? Math.ceil(words / 200) : 0,
    headings,
    images,
    tables,
    links,
    codeBlocks,
  };
}

const EMPTY_STATS: DocumentStats = {
  words: 0,
  characters: 0,
  paragraphs: 0,
  readingMinutes: 0,
  headings: 0,
  images: 0,
  tables: 0,
  links: 0,
  codeBlocks: 0,
};

export function useDocumentStats(editor: Editor | null, debounceMs = 1000): DocumentStats {
  const [stats, setStats] = useState<DocumentStats>(EMPTY_STATS);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      setStats(EMPTY_STATS);
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!editor.isDestroyed) {
          setStats(collectStats(editor));
        }
      }, debounceMs);
    };

    schedule();
    editor.on("update", schedule);
    editor.on("transaction", schedule);

    return () => {
      if (timeout) clearTimeout(timeout);
      editor.off("update", schedule);
      editor.off("transaction", schedule);
    };
  }, [editor, debounceMs]);

  return stats;
}
