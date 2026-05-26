import { Columns2, Maximize2, PanelLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";

interface WidthBtnProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const WidthBtn = ({ icon: Icon, label, isActive, onClick }: WidthBtnProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={isActive}
    title={label}
    className={cn(
      "h-6 w-6 rounded flex items-center justify-center transition-colors duration-100",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40",
      isActive
        ? "text-teal-700 bg-teal-50"
        : "text-stone-400 hover:text-stone-700 hover:bg-stone-100",
    )}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

export const EditorPageWidthControls = () => {
  const pageWidth = useEditorStore((s) => s.pageWidth);
  const setPageWidth = useEditorStore((s) => s.setPageWidth);

  return (
    <div
      className="flex items-center gap-0.5 shrink-0"
      role="group"
      aria-label="Page width"
    >
      <WidthBtn
        icon={PanelLeft}
        label="Normal (800px)"
        isActive={pageWidth === "normal"}
        onClick={() => setPageWidth("normal")}
      />
      <WidthBtn
        icon={Columns2}
        label="Wide (1100px)"
        isActive={pageWidth === "wide"}
        onClick={() => setPageWidth("wide")}
      />
      <WidthBtn
        icon={Maximize2}
        label="Full width"
        isActive={pageWidth === "full"}
        onClick={() => setPageWidth("full")}
      />
    </div>
  );
};
