import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger";

const badgeVariantClass: Record<BadgeVariant, string> = {
  neutral: "cs-kit-badge-neutral",
  brand: "cs-kit-badge-brand",
  success: "cs-kit-badge-success",
  warning: "cs-kit-badge-warning",
  danger: "cs-kit-badge-danger",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={cn("cs-kit-badge", badgeVariantClass[variant], className)} {...props}>
      {children}
    </span>
  );
}

export function Pill({ className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span className={cn("cs-kit-pill", className)} {...props}>
      {children}
    </span>
  );
}

export type StatusDotVariant = "success" | "warning" | "danger" | "muted";

const dotClass: Record<StatusDotVariant, string> = {
  success: "cs-kit-status-dot-success",
  warning: "cs-kit-status-dot-warning",
  danger: "cs-kit-status-dot-danger",
  muted: "cs-kit-status-dot-muted",
};

export function StatusDot({ variant = "muted", className }: { variant?: StatusDotVariant; className?: string }) {
  return <span className={cn("cs-kit-status-dot", dotClass[variant], className)} aria-hidden />;
}
