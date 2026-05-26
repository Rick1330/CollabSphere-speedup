import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function KeyboardKey({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <kbd className={cn("cs-kit-kbd", className)} {...props}>
      {children}
    </kbd>
  );
}
