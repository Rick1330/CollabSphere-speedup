/**
 * Math block — OSS Tiptap Node backed by KaTeX.
 *
 * Stores LaTeX source as `latex` attribute on a custom block node
 * (`mathBlock`). Renders KaTeX HTML inline; falls back to a syntax-error
 * panel on parse failure. No paid dependency.
 *
 * Inline math is intentionally NOT shipped in this pass — block-level math
 * is what document templates (RFC, research brief) actually require, and
 * adding inline math means adding an input rule that competes with `$` in
 * code. We can ship inline math separately.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Code2,
  Eye,
  AlertCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER = String.raw`E = mc^2 \quad \text{or} \quad \sum_{i=1}^{n} i = \frac{n(n+1)}{2}`;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

const MathView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const latex = (node.attrs.latex as string) ?? "";
  const align = (node.attrs.align as "left" | "center" | "right") ?? "center";

  const [mode, setMode] = useState<"preview" | "source">(
    latex.trim().length === 0 ? "source" : "preview",
  );
  const [isHovered, setIsHovered] = useState(false);

  const rendered = useMemo(() => {
    const trimmed = latex.trim();
    if (!trimmed) return { html: "", error: null as string | null };
    try {
      return {
        html: katex.renderToString(trimmed, {
          displayMode: true,
          throwOnError: true,
          strict: "ignore",
          trust: false,
        }),
        error: null,
      };
    } catch (e) {
      return {
        html: "",
        error: e instanceof Error ? e.message : "Invalid LaTeX",
      };
    }
  }, [latex]);

  const isEditable = editor.isEditable;

  const handleAlign = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ align: newAlign });
  };

  return (
    <NodeViewWrapper
      data-type="math-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "not-prose my-6 relative group transition-all duration-200",
        align === "left" && "mr-auto w-fit",
        align === "center" && "mx-auto w-full",
        align === "right" && "ml-auto w-fit",
      )}
    >
      <div className={cn(
        "rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[60px]",
        mode === "source" && "ring-1 ring-stone-200"
      )}>
        {/* Floating Toolbar (Hover only) */}
        {isEditable && isHovered && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white border border-stone-200 shadow-lg rounded-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-0.5 px-1 border-r border-stone-100">
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "p-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                  mode === "preview" ? "bg-teal-50 text-teal-700" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                )}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                type="button"
                onClick={() => setMode("source")}
                className={cn(
                  "p-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                  mode === "source" ? "bg-teal-50 text-teal-700" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                )}
              >
                <Code2 className="h-3.5 w-3.5" /> LaTeX
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1">
              <button
                type="button"
                onClick={() => handleAlign("left")}
                className={cn("p-1.5 rounded-md hover:bg-stone-50 transition-colors", align === "left" ? "text-teal-700 bg-teal-50/50" : "text-stone-500")}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlign("center")}
                className={cn("p-1.5 rounded-md hover:bg-stone-50 transition-colors", align === "center" ? "text-teal-700 bg-teal-50/50" : "text-stone-500")}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlign("right")}
                className={cn("p-1.5 rounded-md hover:bg-stone-50 transition-colors", align === "right" ? "text-teal-700 bg-teal-50/50" : "text-stone-500")}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {(mode === "preview" || !isEditable) && (
          <div className="p-6 flex items-center justify-center min-h-[60px] bg-white text-stone-900">
            {rendered.error ? (
              <div className="flex flex-col items-center gap-2 text-center max-w-md">
                <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-red-900">LaTeX Syntax Error</div>
                  <div className="text-[11px] text-red-600/80 font-mono mt-0.5 max-w-xs truncate opacity-70">
                    {rendered.error}
                  </div>
                </div>
              </div>
            ) : rendered.html ? (
              <div
                className="katex-display-wrapper max-w-full overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: rendered.html }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-stone-400">
                <Sigma className="h-6 w-6 opacity-20" />
                <p className="text-[12px] italic">Empty equation</p>
              </div>
            )}
          </div>
        )}

        {mode === "source" && isEditable && (
          <textarea
            value={latex}
            onChange={(e) => updateAttributes({ latex: e.target.value })}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            className="w-full p-4 text-[13px] font-mono text-stone-800 bg-stone-50/50 outline-none resize-none min-h-[100px] block leading-relaxed"
            autoFocus
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") ?? el.textContent ?? "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "math-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathView);
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = "") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    };
  },
});
