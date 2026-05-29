import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TableInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: {
    rows: number;
    cols: number;
    withHeaderRow: boolean;
    withHeaderColumn: boolean;
    stripedRows: boolean;
  }) => void;
}

export const TableInsertDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: TableInsertDialogProps) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const [withHeaderColumn, setWithHeaderColumn] = useState(false);
  const [stripedRows, setStripedRows] = useState(false);
  const [hoverRows, setHoverRows] = useState<number | null>(null);
  const [hoverCols, setHoverCols] = useState<number | null>(null);

  const selectedRows = hoverRows ?? rows;
  const selectedCols = hoverCols ?? cols;

  const previewRows = useMemo(() => Math.min(6, Math.max(2, selectedRows)), [selectedRows]);
  const previewCols = useMemo(() => Math.min(6, Math.max(2, selectedCols)), [selectedCols]);

  const handleConfirm = () => {
    onConfirm({
      rows: Math.min(50, Math.max(1, rows)),
      cols: Math.min(20, Math.max(1, cols)),
      withHeaderRow,
      withHeaderColumn,
      stripedRows,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Insert Table</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Quick size picker</Label>
            <div className="rounded-md border border-[var(--border-subtle)] p-2">
              <div className="mb-2 text-xs text-[var(--text-tertiary)]">
                {selectedRows} × {selectedCols}
              </div>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
                onMouseLeave={() => {
                  setHoverRows(null);
                  setHoverCols(null);
                }}
              >
                {Array.from({ length: 100 }, (_, index) => {
                  const r = Math.floor(index / 10) + 1;
                  const c = (index % 10) + 1;
                  const active = r <= selectedRows && c <= selectedCols;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      aria-label={`Select ${r} rows and ${c} columns`}
                      className={cn(
                        "h-4 rounded-sm border transition-colors",
                        active
                          ? "border-teal-400 bg-teal-100"
                          : "border-[var(--border-subtle)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)]",
                      )}
                      onMouseEnter={() => {
                        setHoverRows(r);
                        setHoverCols(c);
                      }}
                      onClick={() => {
                        setRows(r);
                        setCols(c);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid items-center gap-2">
              <Label htmlFor="rows">Rows (1-50)</Label>
              <Input
                id="rows"
                type="number"
                value={rows}
                onChange={(e) => setRows(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="h-9"
                min={1}
                max={50}
              />
            </div>
            <div className="grid items-center gap-2">
              <Label htmlFor="cols">Columns (1-20)</Label>
              <Input
                id="cols"
                type="number"
                value={cols}
                onChange={(e) => setCols(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                className="h-9"
                min={1}
                max={20}
              />
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-[var(--border-subtle)] p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="header-row" checked={withHeaderRow} onCheckedChange={(v) => setWithHeaderRow(Boolean(v))} />
              <Label htmlFor="header-row">Header row</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="header-col"
                checked={withHeaderColumn}
                onCheckedChange={(v) => setWithHeaderColumn(Boolean(v))}
              />
              <Label htmlFor="header-col">Header column</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="striped-rows" checked={stripedRows} onCheckedChange={(v) => setStripedRows(Boolean(v))} />
              <Label htmlFor="striped-rows">Striped rows</Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-0)] p-3">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {Array.from({ length: previewRows }, (_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: previewCols }, (_, colIndex) => {
                        const isHeaderRow = withHeaderRow && rowIndex === 0;
                        const isHeaderCol = withHeaderColumn && colIndex === 0;
                        return (
                          <td
                            key={colIndex}
                            className={cn(
                              "border border-stone-200 px-2 py-1 text-center",
                              (isHeaderRow || isHeaderCol) && "bg-stone-100 font-semibold",
                              stripedRows && rowIndex % 2 === 1 && !isHeaderRow && "bg-stone-50",
                            )}
                          >
                            {isHeaderRow || isHeaderCol ? "H" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-teal-600 hover:bg-teal-500">
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
