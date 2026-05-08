import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Scissors } from "lucide-react";

const PageBreakView = () => {
  return (
    <NodeViewWrapper className="my-10 print:m-0 print:border-none print:break-after-page">
      <div className="relative flex items-center justify-center py-4 group print:hidden">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-stone-300 group-hover:border-teal-400 transition-colors" />
        </div>
        <div className="relative flex items-center gap-2 px-4 bg-white border border-stone-200 rounded-full text-[10px] font-bold text-stone-400 uppercase tracking-widest group-hover:text-teal-600 group-hover:border-teal-200 transition-all">
          <Scissors className="h-3 w-3" />
          Page Break
        </div>
      </div>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreakBlock: {
      insertPageBreak: () => ReturnType;
    };
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreakBlock: {
      insertPageBreak: () => ReturnType;
    };
  }
}

export const PageBreakBlock = Node.create({
  name: "pageBreakBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { 
        "data-type": "page-break-block",
        style: "break-after: page; page-break-after: always;" 
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakView);
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    };
  },
});

