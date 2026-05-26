import type { Editor } from "@tiptap/react";

export function clearPendingCommentMark(
  editor: Editor,
  range: { from: number; to: number },
): void {
  editor
    .chain()
    .setTextSelection({ from: range.from, to: range.to })
    .unsetMark("commentMark")
    .run();
}

export function promotePendingCommentMark(
  editor: Editor,
  range: { from: number; to: number },
  realThreadId: string,
): void {
  editor
    .chain()
    .setTextSelection({ from: range.from, to: range.to })
    .unsetMark("commentMark")
    .setMark("commentMark", {
      threadId: realThreadId,
      isPending: false,
      resolved: false,
    })
    .run();
}

export function setCommentMarkResolved(
  editor: Editor,
  threadId: string,
  resolved: boolean,
): void {
  const { state } = editor;
  let tr = state.tr;
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== "commentMark" || mark.attrs.threadId !== threadId) return;
      const from = pos;
      const to = pos + node.nodeSize;
      tr = tr.removeMark(from, to, mark.type);
      tr = tr.addMark(
        from,
        to,
        mark.type.create({
          ...mark.attrs,
          resolved,
          isPending: false,
        }),
      );
      changed = true;
    });
  });

  if (changed) {
    editor.view.dispatch(tr);
  }
}
