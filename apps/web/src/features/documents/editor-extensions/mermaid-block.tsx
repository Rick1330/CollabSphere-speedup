/**
 * Mermaid block — OSS Tiptap Node + ReactNodeView.
 *
 * Stores raw mermaid source as `code` attribute on a custom block node
 * (`mermaidBlock`). Renders a live preview via the OSS `mermaid` package
 * with a collapsible source editor below it. No paid dependencies.
 *
 * Why a custom node (vs. a fenced ```mermaid code block):
 *  - Discoverable in the slash menu and toolbar
 *  - Detectable by the readiness engine (`mermaidBlock` block kind)
 *  - Self-rendering — the user sees the diagram while writing the source
 *  - Survives copy/paste as HTML (`<div data-type="mermaid-block">`)
 */
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import { Code2, Eye, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Initialize once — mermaid is global.
let mermaidInitialized = false;
function ensureMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict", // sanitize user input — no <script> etc.
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  });
  mermaidInitialized = true;
}

const PLACEHOLDER = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Path A]
  B -->|No| D[Path B]`;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaidBlock: (code?: string) => ReturnType;
    };
  }
}

const MermaidView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const code = (node.attrs.code as string) ?? "";
  const [mode, setMode] = useState<"preview" | "source">(
    code.trim().length === 0 ? "source" : "preview",
  );
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const idBase = useId().replace(/[:]/g, "");
  const renderToken = useRef(0);

  useEffect(() => {
    ensureMermaid();
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setSvg("");
      setError(null);
      return;
    }
    const token = ++renderToken.current;
    mermaid
      .render(`m-${idBase}-${token}`, trimmed)
      .then((res) => {
        if (token !== renderToken.current) return;
        setSvg(res.svg);
        setError(null);
      })
      .catch((e: unknown) => {
        if (token !== renderToken.current) return;
        setError(e instanceof Error ? e.message : "Diagram failed to render");
        setSvg("");
      });
  }, [code, idBase]);

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper
      data-type="mermaid-block"
      className="not-prose my-4 rounded-lg border border-stone-200 bg-white overflow-hidden print:break-inside-avoid"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border-b border-stone-200 text-[11px] font-medium text-stone-500">
        <span className="uppercase tracking-wider">Diagram · Mermaid</span>
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
              <Code2 className="h-3 w-3" /> Source
            </button>
          </div>
        )}
      </div>

      {(mode === "preview" || !isEditable) && (
        <div className="p-4 flex items-center justify-center min-h-[80px] bg-white">
          {error ? (
            <div className="flex items-start gap-2 text-[13px] text-amber-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Diagram syntax error</div>
                <div className="opacity-80 mt-0.5">{error}</div>
              </div>
            </div>
          ) : svg ? (
            <div
              className="mermaid-svg max-w-full overflow-x-auto"
              // eslint-disable-next-line react/no-danger -- mermaid sanitizes via securityLevel: 'strict'
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="text-stone-400 text-sm italic">
              Empty diagram — switch to Source to write mermaid syntax.
            </div>
          )}
        </div>
      )}

      {mode === "source" && isEditable && (
        <textarea
          value={code}
          onChange={(e) => updateAttributes({ code: e.target.value })}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          className="w-full p-3 text-[13px] font-mono text-stone-800 bg-stone-50 outline-none resize-y min-h-[140px] block"
        />
      )}
    </NodeViewWrapper>
  );
};

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-code") ?? el.textContent ?? "",
        renderHTML: (attrs) => ({ "data-code": attrs.code }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },

  addCommands() {
    return {
      insertMermaidBlock:
        (code = "") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { code },
          }),
    };
  },
});
