import { Node, mergeAttributes } from "@tiptap/core";

/** Headless page break node for HTML import (no React node view). */
export const PageBreakBlock = Node.create({
  name: "pageBreakBlock",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break-block",
        style: "break-after: page; page-break-after: always;",
      }),
    ];
  },
});
