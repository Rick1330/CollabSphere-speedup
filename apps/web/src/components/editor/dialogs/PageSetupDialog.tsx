import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  detectMarginPreset,
  getPageContentBox,
  marginsFromPreset,
  type MarginPreset,
  type PageFormat,
  type PageOrientation,
  type PageSetup,
} from "@/components/editor/canvas/pageSetup";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";

interface PageSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAT_LABELS: Record<PageFormat, string> = {
  letter: "US Letter (8.5 × 11 in)",
  a4: "A4",
  legal: "Legal (8.5 × 14 in)",
};

const MARGIN_LABELS: Record<MarginPreset, string> = {
  normal: 'Normal (1")',
  narrow: 'Narrow (0.5")',
  wide: 'Wide (1.5")',
};

export function PageSetupDialog({ open, onOpenChange }: PageSetupDialogProps) {
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);

  const [draft, setDraft] = useState<PageSetup>(pageSetup);
  const [marginPreset, setMarginPreset] = useState<MarginPreset>(() =>
    detectMarginPreset(pageSetup.margins),
  );

  useEffect(() => {
    if (!open) return;
    setDraft(pageSetup);
    setMarginPreset(detectMarginPreset(pageSetup.margins));
  }, [open, pageSetup]);

  const preview = useMemo(() => {
    const { pageWidth, pageHeight } = getPageContentBox(draft);
    const maxEdge = 120;
    const scale = maxEdge / Math.max(pageWidth, pageHeight);
    return {
      width: Math.round(pageWidth * scale),
      height: Math.round(pageHeight * scale),
    };
  }, [draft]);

  const handleApply = () => {
    setPageSetup(draft);
    onOpenChange(false);
  };

  const updateDraft = (patch: Partial<PageSetup>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleMarginPresetChange = (preset: MarginPreset) => {
    setMarginPreset(preset);
    updateDraft({ margins: marginsFromPreset(preset) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Page setup</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 py-2">
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="page-format">Paper size</Label>
              <select
                id="page-format"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.format}
                onChange={(e) =>
                  updateDraft({ format: e.target.value as PageFormat })
                }
              >
                {(Object.keys(FORMAT_LABELS) as PageFormat[]).map((format) => (
                  <option key={format} value={format}>
                    {FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-orientation">Orientation</Label>
              <select
                id="page-orientation"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.orientation}
                onChange={(e) =>
                  updateDraft({ orientation: e.target.value as PageOrientation })
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-margins">Margins</Label>
              <select
                id="page-margins"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={marginPreset}
                onChange={(e) =>
                  handleMarginPresetChange(e.target.value as MarginPreset)
                }
              >
                {(Object.keys(MARGIN_LABELS) as MarginPreset[]).map((preset) => (
                  <option key={preset} value={preset}>
                    {MARGIN_LABELS[preset]}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              Applies to the entire document.
            </p>
          </div>

          <div className="flex w-[140px] shrink-0 flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div
              className="flex items-center justify-center rounded-md bg-[var(--surface-2,#f1f3f4)] p-3"
              style={{ width: 140, height: 160 }}
            >
              <div
                className="rounded-sm bg-white shadow-md"
                style={{ width: preview.width, height: preview.height }}
                aria-hidden
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-teal-600 hover:bg-teal-500"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
