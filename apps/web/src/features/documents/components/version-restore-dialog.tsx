import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Above version-history overlay (z-[90]). */
const RESTORE_DIALOG_Z = "z-[100]";

interface VersionRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionLabel: string;
  isRestoring: boolean;
  onConfirm: () => void;
}

export const VersionRestoreDialog = ({
  open,
  onOpenChange,
  versionLabel,
  isRestoring,
  onConfirm,
}: VersionRestoreDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogPortal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          RESTORE_DIALOG_Z,
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "app-light fixed left-[50%] top-[50%] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
          RESTORE_DIALOG_Z,
        )}
      >
      <DialogHeader>
        <DialogTitle>Restore to this version?</DialogTitle>
        <DialogDescription className="space-y-2 pt-1 text-sm text-stone-600">
          <span className="block">{versionLabel}</span>
          <span className="block">
            The current version will be saved as a snapshot first, so you can always undo.
          </span>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={isRestoring}
          className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isRestoring}
          className="inline-flex h-9 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
        >
          {isRestoring ? "Restoring…" : "Restore"}
        </button>
      </DialogFooter>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>
);
