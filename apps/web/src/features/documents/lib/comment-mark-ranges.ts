import type { Editor } from "@tiptap/react";

export interface CommentMarkRange {
  threadId: string;
  from: number;
  to: number;
  isPending: boolean;
  resolved: boolean;
}

export function collectCommentMarkRanges(doc: Editor["state"]["doc"]): CommentMarkRange[] {
  const ranges: CommentMarkRange[] = [];
  let current: CommentMarkRange | null = null;

  doc.descendants((node, pos) => {
    if (!node.isText) {
      if (current) {
        ranges.push(current);
        current = null;
      }
      return;
    }

    const mark = node.marks.find((m) => m.type.name === "commentMark");
    if (!mark?.attrs.threadId) {
      if (current) {
        ranges.push(current);
        current = null;
      }
      return;
    }

    const threadId = String(mark.attrs.threadId);
    const from = pos;
    const to = pos + node.nodeSize;
    const isPending = mark.attrs.isPending === true || String(mark.attrs.isPending) === "true";
    const resolved = mark.attrs.resolved === true || String(mark.attrs.resolved) === "true";

    if (current && current.threadId === threadId) {
      current.to = to;
      return;
    }

    if (current) ranges.push(current);
    current = { threadId, from, to, isPending, resolved };
  });

  if (current) ranges.push(current);
  return ranges;
}

export function resolveSnippetToRange(
  editor: Editor,
  snippet: string,
  docText: string,
  usedRanges: Array<[number, number]>,
): { from: number; to: number } | null {
  let searchFrom = 0;
  while (searchFrom < docText.length) {
    const idx = docText.indexOf(snippet, searchFrom);
    if (idx === -1) break;
    const conflict = usedRanges.some(([s, e]) => idx < e && idx + snippet.length > s);
    if (!conflict) {
      let pmFrom = -1;
      let pmTo = -1;
      let plain = 0;
      editor.state.doc.descendants((node, pos) => {
        if (pmTo !== -1) return false;
        if (node.isText) {
          const len = node.text?.length ?? 0;
          if (pmFrom === -1 && plain + len > idx) {
            pmFrom = pos + (idx - plain);
          }
          if (pmFrom !== -1 && plain + len >= idx + snippet.length) {
            pmTo = pos + (idx + snippet.length - plain);
            return false;
          }
          plain += len;
        } else if (node.isBlock && plain > 0) {
          plain += 1;
        }
        return true;
      });
      if (pmFrom !== -1 && pmTo !== -1) {
        usedRanges.push([pmFrom, pmTo]);
        return { from: pmFrom, to: pmTo };
      }
      break;
    }
    searchFrom = idx + 1;
  }
  return null;
}

export function rangesOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom < bTo && aTo > bFrom;
}
