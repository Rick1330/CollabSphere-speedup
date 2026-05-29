import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TOC_INCLUDED_LEVELS,
  type TocStyle,
} from "@/features/documents/lib/document-toc";

export type TOCInsertOptions = {
  includedLevels: number[];
  style: TocStyle;
  showPageNumbers: boolean;
  clickableLinks: boolean;
};

type InsertTOCDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: TOCInsertOptions) => void;
};

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function InsertTOCDialog({ open, onOpenChange, onConfirm }: InsertTOCDialogProps) {
  const [includedLevels, setIncludedLevels] = useState<number[]>([...DEFAULT_TOC_INCLUDED_LEVELS]);
  const [style, setStyle] = useState<TocStyle>("indented");
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [clickableLinks, setClickableLinks] = useState(true);

  const toggleLevel = (level: number) => {
    setIncludedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level].sort((a, b) => a - b),
    );
  };

  const handleInsert = () => {
    if (includedLevels.length === 0) return;
    onConfirm({ includedLevels, style, showPageNumbers, clickableLinks });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Insert Table of Contents</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Include</Label>
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <Checkbox
                    id={`toc-h${level}`}
                    checked={includedLevels.includes(level)}
                    onCheckedChange={() => toggleLevel(level)}
                  />
                  <Label htmlFor={`toc-h${level}`}>Heading {level}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium">Style</Label>
            <div className="flex flex-col gap-1">
              {(
                [
                  { id: "indented", label: "Indented" },
                  { id: "numbered", label: "Numbered (1.1, 1.1.1)" },
                  { id: "flat", label: "Flat list" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm border",
                    style === opt.id
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-stone-200 hover:bg-stone-50",
                  )}
                  onClick={() => setStyle(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-stone-200 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="toc-page-numbers"
                checked={showPageNumbers}
                onCheckedChange={(v) => setShowPageNumbers(Boolean(v))}
              />
              <Label htmlFor="toc-page-numbers">Show page numbers</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="toc-clickable"
                checked={clickableLinks}
                onCheckedChange={(v) => setClickableLinks(Boolean(v))}
              />
              <Label htmlFor="toc-clickable">Clickable links</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={includedLevels.length === 0}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
