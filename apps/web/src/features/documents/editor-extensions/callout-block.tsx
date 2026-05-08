import { Node, mergeAttributes, type RawCommands } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { Info, AlertTriangle, CheckCircle2, XCircle, ChevronDown, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export type CalloutType = "info" | "warning" | "success" | "error";

const CALLOUT_CONFIG = {
  info: { icon: Info, bg: "bg-blue-50/50", border: "border-blue-200", text: "text-blue-900", iconColor: "text-blue-500" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50/50", border: "border-amber-200", text: "text-amber-900", iconColor: "text-amber-500" },
  success: { icon: CheckCircle2, bg: "bg-emerald-50/50", border: "border-emerald-200", text: "text-emerald-900", iconColor: "text-emerald-500" },
  error: { icon: XCircle, bg: "bg-red-50/50", border: "border-red-200", text: "text-red-900", iconColor: "text-red-500" },
};

const CalloutView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const type = (node.attrs.type as CalloutType) ?? "info";
  const config = CALLOUT_CONFIG[type];
  const Icon = config.icon;
  const [isHovered, setIsHovered] = useState(false);

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="my-6 group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("relative rounded-xl border p-4 flex gap-3 transition-all duration-300", config.bg, config.border, config.text)}>
        {/* Comment Trigger */}
        {isHovered && (
          <button className="absolute -left-10 top-2 p-1.5 rounded-full bg-teal-500 text-white shadow-md hover:scale-110 transition-transform">
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        )}
        <div className={cn("mt-0.5", config.iconColor)}><Icon className="h-5 w-5" /></div>
        <NodeViewContent className="flex-1 min-w-0 prose-sm prose-stone leading-relaxed" />
        {isEditable && isHovered && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white border border-stone-200 shadow-lg rounded-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  <span className="capitalize">{type}</span><ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-32">
                {(["info", "warning", "success", "error"] as CalloutType[]).map((t) => (
                  <DropdownMenuItem key={t} onClick={() => updateAttributes({ type: t })} className="text-xs capitalize">{t}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    calloutBlock: {
      insertCallout: (type?: CalloutType) => ReturnType;
    };
  }
}

export const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  draggable: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-type") ?? "info",
        renderHTML: (attrs) => ({ "data-type": attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout-block" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      insertCallout:
        (type: CalloutType = "info") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
