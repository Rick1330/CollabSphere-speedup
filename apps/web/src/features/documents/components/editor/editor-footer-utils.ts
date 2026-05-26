import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

interface CharacterCountStorage {
  words: () => number;
  characters: () => number;
}

export function readEditorCounts(editor: Editor | null): { words: number; chars: number } {
  if (!editor || editor.isDestroyed) return { words: 0, chars: 0 };
  const storage = editor.storage as { characterCount?: CharacterCountStorage };
  const cc = storage.characterCount;
  if (!cc) return { words: 0, chars: 0 };
  return {
    words: cc.words(),
    chars: cc.characters(),
  };
}

export function useEditorCounts(editor: Editor | null): { words: number; chars: number } {
  const [counts, setCounts] = useState(() => readEditorCounts(editor));

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const update = () => setCounts(readEditorCounts(editor));
    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  return counts;
}
