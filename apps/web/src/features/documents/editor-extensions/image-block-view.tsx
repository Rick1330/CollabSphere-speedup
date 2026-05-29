import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BlockCanvasToolbar,
  deleteNodeAtPos,
  selectNodeAtPos,
  useBlockHoverState,
} from "@/features/documents/components/editor/block-canvas-toolbar";

export function ImageBlockView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const src = (node.attrs.src as string) ?? "";
  const alt = (node.attrs.alt as string) ?? "";
  const align = (node.attrs.align as "left" | "center" | "right") ?? "center";
  const width = Number(node.attrs.width ?? 100);
  const [isResizing, setIsResizing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const { hovered, onEnter, onLeave, onToolbarEnter, onToolbarLeave } = useBlockHoverState(150);
  const isEditable = editor.isEditable;
  const showChrome = isEditable && (hovered || isResizing);

  const setWidthPercent = (next: number) => {
    const clamped = Math.min(100, Math.max(15, Math.round(next)));
    updateAttributes({ width: clamped });
  };

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      const startX = e.clientX;
      const parentWidth = frameRef.current?.parentElement?.offsetWidth ?? 1;
      const startWidth = width;

      const onMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / parentWidth) * 100;
        setWidthPercent(startWidth + deltaPercent);
      };

      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width],
  );

  return (
    <NodeViewWrapper
      className={cn(
        "cs-editor-image-block my-4 relative overflow-visible",
        align === "left" && "mr-auto",
        align === "center" && "mx-auto",
        align === "right" && "ml-auto",
      )}
      style={{ width: `${width}%` }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        ref={frameRef}
        className={cn(
          "relative rounded-md border border-transparent transition-colors",
          showChrome && "border-stone-200 bg-stone-50/30",
          isResizing && "ring-2 ring-teal-500/30",
        )}
        onClick={() => {
          if (isEditable) selectNodeAtPos(editor, getPos);
        }}
      >
        {isEditable && (
          <BlockCanvasToolbar
            editor={editor}
            visible={showChrome}
            placement="overlay-top"
            anchorRef={frameRef}
            onToolbarMouseEnter={onToolbarEnter}
            onToolbarMouseLeave={onToolbarLeave}
            onDelete={() => deleteNodeAtPos(editor, getPos)}
          >
            <button
              type="button"
              aria-label="Align left"
              className="p-1.5 rounded-md hover:bg-stone-50 text-stone-500 text-[10px] font-medium"
              onClick={() => updateAttributes({ align: "left" })}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Align center"
              className="p-1.5 rounded-md hover:bg-stone-50 text-stone-500"
              onClick={() => updateAttributes({ align: "center" })}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Align right"
              className="p-1.5 rounded-md hover:bg-stone-50 text-stone-500"
              onClick={() => updateAttributes({ align: "right" })}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <span className="w-px h-4 bg-stone-200" aria-hidden="true" />
            {[50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  width === pct ? "bg-teal-50 text-teal-700" : "text-stone-500 hover:bg-stone-50",
                )}
                onClick={() => setWidthPercent(pct)}
              >
                {pct}%
              </button>
            ))}
          </BlockCanvasToolbar>
        )}

        <img
          src={src}
          alt={alt}
          className="cs-editor-image block max-w-full h-auto rounded-md pointer-events-none select-none"
          data-align={align}
          data-width={String(width)}
          draggable={false}
        />

        {isEditable && (
          <div
            role="separator"
            aria-label="Resize image"
            onMouseDown={startResize}
            className={cn(
              "absolute bottom-1 right-1 h-3 w-3 rounded-sm border border-white bg-teal-600 shadow cursor-nwse-resize",
              showChrome ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
