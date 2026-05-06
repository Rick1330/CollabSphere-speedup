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
import { Code2, Eye, AlertCircle } from "lucide-react";
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
  const [mode, setMode] = useState<"preview" | "source">(
    latex.trim().length === 0 ? "source" : "preview",
  );

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

  return (
    <NodeViewWrapper
      data-type="math-block"
      className="not-prose my-4 rounded-lg border border-stone-200 bg-white overflow-hidden print:break-inside-avoid"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border-b border-stone-200 text-[11px] font-medium text-stone-500">
        <span className="uppercase tracking-wider">Math · KaTeX</span>
        {isEditable && (
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "px-2 py-0.5 rounded flex items-center gap-1 transition-colors",
                mode === "preview"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700",
              )}
              aria-pressed={mode === "preview"}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
            <button
              type="button"
              onClick={() => setMode("source")}
              className={cn(
                "px-2 py-0.5 rounded flex items-center gap-1 transition-colors",
                mode === "source"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700",
              )}
              aria-pressed={mode === "source"}
            >
              <Code2 className="h-3 w-3" /> LaTeX
            </button>
          </div>
        )}
      </div>

      {(mode === "preview" || !isEditable) && (
        <div className="p-4 flex items-center justify-center min-h-[60px] bg-white text-stone-900">
          {rendered.error ? (
            <div className="flex items-start gap-2 text-[13px] text-amber-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">LaTeX error</div>
                <div className="opacity-80 mt-0.5 font-mono text-xs">
                  {rendered.error}
                </div>
              </div>
            </div>
          ) : rendered.html ? (
            <div
              className="katex-display-wrapper max-w-full overflow-x-auto"
              // eslint-disable-next-line react/no-danger -- KaTeX output is sanitized HTML; trust:false disables \href etc.
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          ) : (
            <div className="text-stone-400 text-sm italic">
              Empty equation — switch to LaTeX to write source.
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
          className="w-full p-3 text-[13px] font-mono text-stone-800 bg-stone-50 outline-none resize-y min-h-[100px] block"
        />
      )}
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
