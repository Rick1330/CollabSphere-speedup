import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runTableCommand } from "@/components/editor/shell/Toolbar/toolbar-utils";

type TablePropertiesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

export function TablePropertiesDialog({ open, onOpenChange, editor }: TablePropertiesDialogProps) {
  const [stripedRows, setStripedRows] = useState(false);
  const [borderColor, setBorderColor] = useState("#e5e7eb");
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderStyle, setBorderStyle] = useState("solid");
  const [cellPadding, setCellPadding] = useState(8);

  useEffect(() => {
    if (!open || !editor || editor.isDestroyed) return;
    const attrs = editor.getAttributes("table") as Record<string, unknown>;
    setStripedRows(Boolean(attrs.stripedRows));
    setBorderColor(String(attrs.borderColor ?? "#e5e7eb"));
    setBorderWidth(Number(attrs.borderWidth ?? 1));
    setBorderStyle(String(attrs.borderStyle ?? "solid"));
    setCellPadding(Number(attrs.cellPadding ?? 8));
  }, [open, editor]);

  const apply = () => {
    if (!editor || editor.isDestroyed) return;
    editor
      .chain()
      .focus()
      .updateAttributes("table", {
        stripedRows,
        borderColor,
        borderWidth: Math.min(5, Math.max(0, borderWidth)),
        borderStyle,
        cellPadding: Math.min(20, Math.max(0, cellPadding)),
      })
      .run();
    onOpenChange(false);
  };

  const deleteTable = () => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.focus();
    runTableCommand(editor, "deleteTable");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Table Properties</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex items-center gap-2">
            <Checkbox id="tbl-striped" checked={stripedRows} onCheckedChange={(v) => setStripedRows(Boolean(v))} />
            <Label htmlFor="tbl-striped">Striped rows</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tbl-border-color">Border color</Label>
              <Input
                id="tbl-border-color"
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tbl-border-width">Border width</Label>
              <Input
                id="tbl-border-width"
                type="number"
                min={0}
                max={5}
                value={borderWidth}
                onChange={(e) => setBorderWidth(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Border style</Label>
            <Select value={borderStyle} onValueChange={setBorderStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tbl-cell-padding">Cell padding</Label>
            <Input
              id="tbl-cell-padding"
              type="number"
              min={0}
              max={20}
              value={cellPadding}
              onChange={(e) => setCellPadding(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => runTableCommand(editor, "toggleHeaderRow")}>
              Toggle header row
            </Button>
            <Button type="button" variant="outline" onClick={() => runTableCommand(editor, "toggleHeaderColumn")}>
              Toggle header column
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            className="sm:mr-auto"
            onClick={deleteTable}
          >
            Delete table
          </Button>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={apply}>Apply</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
