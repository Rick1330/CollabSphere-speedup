import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import {
  Layout,
  AlertCircle,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const SectionView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const title = (node.attrs.title as string) ?? "Section Title";
  const isRequired = (node.attrs.required as boolean) ?? false;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper
      className="my-8 scroll-mt-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative group rounded-xl border border-stone-100 bg-white transition-all duration-300",
          isRequired && "border-l-4 border-l-teal-500 shadow-sm",
          !isRequired && "border-l-stone-200"
        )}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-50 bg-stone-50/30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Layout className="h-4 w-4 text-stone-400 flex-shrink-0" />
            {isEditingTitle && isEditable ? (
              <Input
                value={title}
                onChange={(e) => updateAttributes({ title: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                className="h-8 py-1 px-2 text-sm font-semibold max-w-sm"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h3 
                  onClick={() => isEditable && setIsEditingTitle(true)}
                  className={cn(
                    "text-sm font-semibold text-stone-900 truncate",
                    isEditable && "cursor-text hover:text-stone-600"
                  )}
                >
                  {title}
                </h3>
                {isRequired && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-50 text-[10px] font-bold text-teal-700 border border-teal-100 uppercase tracking-wider">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Required
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Hover Settings */}
          {isEditable && isHovered && (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                    Rename section
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => updateAttributes({ required: !isRequired })}
                    className="flex items-center justify-between"
                  >
                    <span>Required section</span>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isRequired ? "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" : "bg-stone-200"
                    )} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="p-5">
          <NodeViewContent className="prose-sm prose-stone leading-relaxed min-h-[40px]" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionBlock: {
      insertSection: (title?: string) => ReturnType;
    };
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionBlock: {
      insertSection: (title?: string) => ReturnType;
    };
  }
}

export const SectionBlock = Node.create({
  name: "sectionBlock",
  group: "block",
  content: "block+",
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "New Section",
        parseHTML: (el) => el.getAttribute("data-title") ?? "New Section",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      required: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-required") === "true",
        renderHTML: (attrs) => ({ "data-required": attrs.required }),
      },
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("id"),
        renderHTML: (attrs) => ({ id: attrs.id || `section-${Math.random().toString(36).slice(2, 9)}` }),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "section-block" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionView);
  },

  addCommands() {
    return {
      insertSection:
        (title = "New Section") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title, id: `section-${Math.random().toString(36).slice(2, 9)}` },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});

