import { useState } from "react";
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

interface TableInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rows: number, cols: number) => void;
}

export const TableInsertDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: TableInsertDialogProps) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleConfirm = () => {
    onConfirm(Math.max(1, rows), Math.max(1, cols));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle>Insert Table</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rows" className="text-right">
              Rows
            </Label>
            <Input
              id="rows"
              type="number"
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              className="col-span-3 h-8"
              min={1}
              max={50}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cols" className="text-right">
              Cols
            </Label>
            <Input
              id="cols"
              type="number"
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              className="col-span-3 h-8"
              min={1}
              max={20}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full bg-teal-600 hover:bg-teal-500">
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
