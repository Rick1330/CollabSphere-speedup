import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="cs-kit-sheet-overlay" />
      <DialogPrimitive.Content className={cn("cs-kit-sheet-panel", "cs-kit-font-ui", className)} {...props}>
        {children}
        <SheetClose asChild>
          <IconButton aria-label="Close panel" className="absolute right-4 top-4">
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </SheetClose>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type SheetProps = { children: ReactNode };
