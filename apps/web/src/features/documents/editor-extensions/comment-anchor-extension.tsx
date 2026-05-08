import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";

const AnchorView = ({ editor }: NodeViewProps) => {
  const isEditable = editor.isEditable;
  
  if (!isEditable) return null;

  return (
    <NodeViewWrapper className="inline-block relative">
      <button 
        className="absolute -top-6 -left-3 p-1 rounded-full bg-teal-500 text-white shadow-lg hover:scale-110 transition-transform z-50"
        onClick={() => {
           // This will need integration with your comment store
           console.log("Create comment at selection");
        }}
      >
        <MessageSquarePlus className="h-3 w-3" />
      </button>
    </NodeViewWrapper>
  );
};

export const CommentAnchorExtension = Node.create({
  name: "commentAnchor",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      threadId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="comment-anchor"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "comment-anchor" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnchorView);
  },
});
