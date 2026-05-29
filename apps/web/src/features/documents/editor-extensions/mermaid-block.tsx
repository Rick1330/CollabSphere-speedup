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
import { useCallback, useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  Code2,
  Eye,
  AlertCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  ChevronDown,
  Trash2,
  Workflow,
} from "lucide-react";
import { deleteNodeAtPos } from "@/features/documents/components/editor/block-canvas-toolbar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Initialize once — mermaid is global.
let mermaidInitialized = false;
function ensureMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  });
  mermaidInitialized = true;
}

const PLACEHOLDER = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Path A]
  B -->|No| D[Path B]`;

type ResizeMode = "horizontal" | "vertical" | "both";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaidBlock: (code?: string) => ReturnType;
    };
  }
}

const MermaidView = ({ node, updateAttributes, editor, getPos }: NodeViewProps) => {
  const code = (node.attrs.code as string) ?? "";
  const align = (node.attrs.align as "left" | "center" | "right") ?? "center";
  const width = (node.attrs.width as string) ?? "100%";
  const height = (node.attrs.height as string) ?? "auto";

  const [mode, setMode] = useState<"preview" | "source">(
    code.trim().length === 0 ? "source" : "preview",
  );
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
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

  const handleAlign = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ align: newAlign });
  };

  const handleWidth = (newWidth: string) => {
    updateAttributes({ width: newWidth });
  };

  const startResizing = useCallback((e: React.MouseEvent, mode: ResizeMode) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = containerRef.current?.offsetWidth ?? 0;
    const startHeight = containerRef.current?.offsetHeight ?? 0;
    const aspectRatio = startWidth / startHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const deltaY = moveEvent.pageY - startY;
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (mode === "horizontal" || mode === "both") {
        newWidth = Math.max(200, startWidth + deltaX);
      }

      if (mode === "vertical" || mode === "both") {
        newHeight = Math.max(120, startHeight + deltaY);
      }

      if (mode === "both") {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = Math.max(120, newWidth / aspectRatio);
        } else {
          newWidth = Math.max(200, newHeight * aspectRatio);
        }
      }

      const parentWidth = containerRef.current?.parentElement?.offsetWidth ?? 1;
      const newPercentage = (newWidth / parentWidth) * 100;

      // Apply new dimensions
      updateAttributes({
        width: `${newPercentage.toFixed(1)}%`,
        height: `${newHeight.toFixed(1)}px`,
      });
      
      // Force SVG content to respect container dimensions
      const svgEl = containerRef.current?.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = 'auto';
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper
      data-type="mermaid-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "not-prose my-6 relative group overflow-visible transition-all duration-200",
        align === "left" && "mr-auto",
        align === "center" && "mx-auto",
        align === "right" && "ml-auto",
      )}
      style={height === "auto" ? { width } : { width, height }}
    >
      <div 
        ref={containerRef}
        className={cn(
          "relative rounded-xl border border-stone-200 bg-white overflow-visible shadow-sm hover:shadow-md transition-shadow duration-300",
          isResizing && "ring-2 ring-teal-500/20 border-teal-500/50"
        )}
        style={height === "auto" ? undefined : { height: "100%" }}
      >
        {/* Floating Toolbar (Hover only) */}
        {isEditable && (isHovered || isResizing) && (
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
                <Code2 className="h-3.5 w-3.5" /> Source
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1 border-r border-stone-100">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md text-stone-500 hover:bg-stone-50 transition-colors flex items-center gap-1 text-[11px]">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="min-w-[2.5rem]">{width}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-24">
                {["25%", "50%", "75%", "100%"].map((w) => (
                  <DropdownMenuItem key={w} onClick={() => handleWidth(w)} className="text-xs">
                    {w}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              aria-label="Delete diagram"
              title="Delete"
              onClick={() => deleteNodeAtPos(editor, getPos)}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className={cn("relative min-h-[100px] flex flex-col bg-white overflow-hidden rounded-xl", height !== "auto" && "h-full")}>
          {(mode === "preview" || !isEditable) && (
            <div className={cn("p-8 flex items-center justify-center min-h-[120px]", height !== "auto" && "h-full")}>
              {error ? (
                <div className="flex flex-col items-center gap-3 text-center max-w-md">
                  <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-amber-900">Diagram Error</div>
                    <div className="text-[12px] text-amber-700/80 font-mono mt-1 leading-relaxed bg-amber-50/50 p-2 rounded border border-amber-100">
                      {error}
                    </div>
                  </div>
                </div>
              ) : svg ? (
                <div
                  className="mermaid-svg max-w-full w-full h-full overflow-hidden transition-opacity duration-300"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-stone-400">
                  <Workflow className="h-8 w-8 opacity-20" />
                  <p className="text-[13px] italic">Empty diagram. Switch to source to add content.</p>
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
              className={cn(
                "w-full p-4 text-[13px] font-mono text-stone-800 bg-stone-50/50 outline-none resize-none min-h-[180px] block leading-relaxed",
                height !== "auto" && "h-full",
              )}
              autoFocus
            />
          )}

          {/* Manual Resize Handle */}
          {isEditable && (
            <div
              onMouseDown={(event) => startResizing(event, "both")}
              className={cn(
                "absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group/handle",
                isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover/handle:bg-teal-500 transition-colors mr-0.5 mb-0.5 shadow-sm" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-linear-to-tl from-stone-100/50 to-transparent pointer-events-none rounded-br-xl" />
            </div>
          )}

          {isEditable && (
            <div
              onMouseDown={(event) => startResizing(event, "horizontal")}
              className={cn(
                "absolute top-1/2 right-0 -translate-y-1/2 w-3 h-16 cursor-ew-resize flex items-center justify-end pr-0.5 z-10",
                isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <div className="h-10 w-1 rounded-full bg-stone-200 group-hover:bg-teal-500 transition-colors shadow-sm" />
            </div>
          )}

          {isEditable && (
            <div
              onMouseDown={(event) => startResizing(event, "vertical")}
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-16 cursor-ns-resize flex items-end justify-center pb-0.5 z-10",
                isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <div className="w-10 h-1 rounded-full bg-stone-200 group-hover:bg-teal-500 transition-colors shadow-sm" />
            </div>
          )}
        </div>
      </div>
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
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      width: {
        default: "100%",
        parseHTML: (el) => el.getAttribute("data-width") ?? "100%",
        renderHTML: (attrs) => ({ "data-width": attrs.width }),
      },
      height: {
        default: "auto",
        parseHTML: (el) => el.getAttribute("data-height") ?? "auto",
        renderHTML: (attrs) => ({ "data-height": attrs.height }),
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
