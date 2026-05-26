import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="cs-kit-dialog-overlay" />
      <DialogPrimitive.Content className={cn("cs-kit-dialog-content", "cs-kit-font-ui", className)} {...props}>
        {children}
        <DialogClose asChild>
          <IconButton
            aria-label="Close dialog"
            className="absolute right-4 top-4"
          >
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </DialogClose>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("cs-kit-dialog-title", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("cs-kit-dialog-desc", className)} {...props} />;
}

export type DialogProps = { children: ReactNode };
