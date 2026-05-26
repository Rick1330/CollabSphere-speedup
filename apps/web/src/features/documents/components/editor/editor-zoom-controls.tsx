import { Minus, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useEditorStore,
  ZOOM_PRESETS,
} from "@/features/documents/stores/use-editor-store";

interface EditorZoomControlsProps {
  onFitWidth?: () => void;
  onFitPage?: () => void;
  /** @deprecated Use onFitWidth */
  onFitToPage?: () => void;
}

export const EditorZoomControls = ({
  onFitWidth,
  onFitPage,
  onFitToPage,
}: EditorZoomControlsProps) => {
  const fitWidth = onFitWidth ?? onFitToPage;
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);

  return (
    <div
      className="flex items-center gap-0.5 shrink-0"
      role="group"
      aria-label="Zoom"
    >
      <button
        type="button"
        onClick={zoomOut}
        aria-label="Zoom out"
        title="Zoom out (Ctrl+-)"
        className={cn(
          "h-6 w-6 rounded flex items-center justify-center transition-colors",
          "text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-2)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-500)]/40",
        )}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Zoom level ${zoomLevel} percent`}
            title="Select zoom level"
            className={cn(
              "min-w-[3rem] h-6 rounded px-1.5 text-[11px] font-medium tabular-nums transition-colors",
              "text-[var(--text-default)] hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-500)]/40",
            )}
          >
            {zoomLevel}%
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          {fitWidth ? (
            <DropdownMenuItem onClick={fitWidth} className="text-xs font-medium">
              Fit width
            </DropdownMenuItem>
          ) : null}
          {onFitPage ? (
            <DropdownMenuItem onClick={onFitPage} className="text-xs font-medium">
              Fit page
            </DropdownMenuItem>
          ) : null}
          {(fitWidth || onFitPage) && <DropdownMenuSeparator />}
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset}
              onClick={() => setZoomLevel(preset)}
              className={cn(
                "text-xs tabular-nums",
                preset === zoomLevel && "font-semibold text-[var(--brand-600)]",
              )}
            >
              {preset}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={zoomIn}
        aria-label="Zoom in"
        title="Zoom in (Ctrl+=)"
        className={cn(
          "h-6 w-6 rounded flex items-center justify-center transition-colors",
          "text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-2)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-500)]/40",
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
