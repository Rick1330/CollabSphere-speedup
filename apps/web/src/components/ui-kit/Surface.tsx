import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type SurfaceVariant = "page" | "panel" | "overlay" | "inset";

const variantClass: Record<SurfaceVariant, string> = {
  page: "cs-kit-surface-page",
  panel: "cs-kit-surface-panel",
  overlay: "cs-kit-surface-overlay",
  inset: "cs-kit-surface-inset",
};

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  children: ReactNode;
};

export function Surface({ variant = "page", className, children, ...props }: SurfaceProps) {
  return (
    <div className={cn("cs-kit-font-ui", variantClass[variant], className)} {...props}>
      {children}
    </div>
  );
}
