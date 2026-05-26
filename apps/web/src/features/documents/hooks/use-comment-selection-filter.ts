import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { CommentThread } from "@/lib/mock-comments";
import { filterThreadsByEditorSelection } from "@/features/documents/lib/comment-selection-filter";

export interface CommentSelectionFilterState {
  railThreads: CommentThread[];
  selectionFilterActive: boolean;
}

function sameFilterState(
  a: CommentSelectionFilterState,
  b: CommentSelectionFilterState,
): boolean {
  if (a.selectionFilterActive !== b.selectionFilterActive) return false;
  if (a.railThreads.length !== b.railThreads.length) return false;
  return a.railThreads.every((t, i) => t.id === b.railThreads[i]?.id);
}

/**
 * Subscribes to editor selection locally so the document page shell does not
 * re-render on every caret move (only when bypass clears or thread list changes).
 */
export function useCommentSelectionFilter(
  visibleThreads: CommentThread[],
  editor: Editor | null,
  selectionFilterBypass: boolean,
  onClearSelectionFilterBypass: () => void,
): CommentSelectionFilterState {
  const [filterState, setFilterState] = useState<CommentSelectionFilterState>(() =>
    computeFilter(visibleThreads, editor, selectionFilterBypass),
  );

  useEffect(() => {
    setFilterState((prev) => {
      const next = computeFilter(visibleThreads, editor, selectionFilterBypass);
      return sameFilterState(prev, next) ? prev : next;
    });
  }, [visibleThreads, editor, selectionFilterBypass]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const onSelectionUpdate = () => {
      if (selectionFilterBypass) {
        onClearSelectionFilterBypass();
        return;
      }
      setFilterState((prev) => {
        const next = computeFilter(visibleThreads, editor, false);
        return sameFilterState(prev, next) ? prev : next;
      });
    };

    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, visibleThreads, selectionFilterBypass, onClearSelectionFilterBypass]);

  return filterState;
}

function computeFilter(
  visibleThreads: CommentThread[],
  editor: Editor | null,
  bypass: boolean,
): CommentSelectionFilterState {
  if (bypass) {
    return { railThreads: visibleThreads, selectionFilterActive: false };
  }
  const result = filterThreadsByEditorSelection(visibleThreads, editor);
  return {
    railThreads: result.threads,
    selectionFilterActive: result.isFiltered,
  };
}
