import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { ListTree, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const TOCView = ({ editor }: NodeViewProps) => {
  const [items, setItems] = useState<TOCItem[]>([]);

  const generateTOC = useCallback(() => {
    const headings: TOCItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        headings.push({
          id: `heading-${pos}`,
          text: node.textContent,
          level: node.attrs.level,
        });
      }
    });
    setItems(headings);
  }, [editor]);

  useEffect(() => {
    generateTOC();
    editor.on("update", generateTOC);
    return () => {
      editor.off("update", generateTOC);
    };
  }, [editor, generateTOC]);

  return (
    <NodeViewWrapper className="my-8">
      <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-stone-900 font-semibold">
            <ListTree className="h-4 w-4 text-teal-600" />
            <h4 className="text-sm">Table of Contents</h4>
          </div>
          <button 
            onClick={generateTOC}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            title="Refresh TOC"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-[13px] text-stone-400 italic">
            Add headings to see them here.
          </p>
        ) : (
          <nav className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "text-[13px] text-stone-600 hover:text-teal-600 transition-colors truncate",
                  item.level === 1 && "font-medium pl-0",
                  item.level === 2 && "pl-4",
                  item.level === 3 && "pl-8",
                  item.level > 3 && "pl-12"
                )}
              >
                <span className="opacity-40 mr-2">·</span>
                {item.text}
              </div>
            ))}
          </nav>
        )}
      </div>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tocBlock: {
      insertTOC: () => ReturnType;
    };
  }
}

export const TOCBlock = Node.create({
  name: "tocBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toc-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "toc-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TOCView);
  },

  addCommands() {
    return {
      insertTOC:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    };
  },
});
