import type { Editor } from "@tiptap/react";
import type { CommentThread } from "@/lib/mock-comments";
import {
  collectCommentMarkRanges,
  rangesOverlap,
  resolveSnippetToRange,
} from "@/features/documents/lib/comment-mark-ranges";

export interface CommentSelectionFilterResult {
  threads: CommentThread[];
  isFiltered: boolean;
}

function resolveThreadRange(
  editor: Editor,
  thread: CommentThread,
  markByThreadId: Map<string, { from: number; to: number }>,
  docText: string,
  usedRanges: Array<[number, number]>,
): { from: number; to: number } | null {
  const markRange = markByThreadId.get(thread.id);
  if (markRange) return markRange;

  const anchor = thread.anchor;
  if (!anchor) return null;

  const docSize = editor.state.doc.content.size;
  const from = anchor.from;
  const to = anchor.to;
  if (
    typeof from === "number" &&
    typeof to === "number" &&
    from >= 0 &&
    to > from &&
    to <= docSize
  ) {
    return { from, to };
  }

  if (anchor.snippet) {
    const resolved = resolveSnippetToRange(editor, anchor.snippet, docText, usedRanges);
    if (resolved) return resolved;
  }

  return null;
}

export function filterThreadsByEditorSelection(
  threads: CommentThread[],
  editor: Editor | null,
  minLength = 2,
): CommentSelectionFilterResult {
  if (!editor || editor.isDestroyed) {
    return { threads, isFiltered: false };
  }

  const { from: selFrom, to: selTo, empty } = editor.state.selection;
  if (empty || selTo - selFrom < minLength) {
    return { threads, isFiltered: false };
  }

  const docSize = editor.state.doc.content.size;
  const docText = editor.state.doc.textBetween(0, docSize, "\n", " ");
  const markByThreadId = new Map<string, { from: number; to: number }>();

  for (const range of collectCommentMarkRanges(editor.state.doc)) {
    if (range.resolved) continue;
    markByThreadId.set(range.threadId, { from: range.from, to: range.to });
  }

  const usedRanges: Array<[number, number]> = [];
  const filtered = threads.filter((thread) => {
    const range = resolveThreadRange(editor, thread, markByThreadId, docText, usedRanges);
    if (!range) return false;
    return rangesOverlap(range.from, range.to, selFrom, selTo);
  });

  return { threads: filtered, isFiltered: true };
}
