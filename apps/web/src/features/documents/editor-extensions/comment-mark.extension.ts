import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export type CommentMarkOptions = {
  onThreadClick?: (threadId: string) => void;
};

export const CommentMarkExtension = Mark.create<CommentMarkOptions>({
  name: "commentMark",
  spanning: false,
  inclusive: false,

  addOptions() {
    return {
      onThreadClick: undefined,
    };
  },

  addAttributes() {
    return {
      threadId: { default: null },
      resolved: { default: false },
      isPending: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-thread-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const threadId = HTMLAttributes.threadId;
    const isPending = HTMLAttributes.isPending === true || HTMLAttributes.isPending === "true";
    const resolved = HTMLAttributes.resolved === true || HTMLAttributes.resolved === "true";
    const classes = ["comment-anchor--marker"];
    if (isPending) classes.push("comment-anchor--pending");
    if (resolved) classes.push("comment-anchor--resolved");

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-comment-thread-id": threadId,
        class: classes.join(" "),
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    const onThreadClick = this.options.onThreadClick;
    return [
      new Plugin({
        props: {
          handleClick(_view, _pos, event) {
            if (!onThreadClick) return false;
            const target = event.target as HTMLElement | null;
            const anchorEl = target?.closest?.(
              "[data-comment-thread-id]",
            ) as HTMLElement | null;
            const threadId = anchorEl?.getAttribute("data-comment-thread-id");
            if (!threadId || threadId.startsWith("pending-")) return false;
            onThreadClick(threadId);
            return true;
          },
        },
      }),
    ];
  },
});
