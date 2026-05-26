import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ResizeHandleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  orientation?: "vertical" | "horizontal";
};

export function ResizeHandle({
  className,
  orientation = "vertical",
  "aria-label": ariaLabel = "Resize panel",
  ...props
}: ResizeHandleProps) {
  return (
    <button
      type="button"
      className={cn("cs-kit-resize-handle", "cs-kit-focus", className)}
      aria-label={ariaLabel}
      data-orientation={orientation}
      {...props}
    />
  );
}
