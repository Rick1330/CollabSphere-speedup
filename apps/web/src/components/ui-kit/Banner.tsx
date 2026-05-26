import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export type BannerVariant = "info" | "success" | "warning" | "danger";

const variantClass: Record<BannerVariant, string> = {
  info: "cs-kit-banner-info",
  success: "cs-kit-banner-success",
  warning: "cs-kit-banner-warning",
  danger: "cs-kit-banner-danger",
};

export type BannerProps = {
  variant?: BannerVariant;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

export function Banner({ variant = "info", children, onDismiss, className }: BannerProps) {
  return (
    <div className={cn("cs-kit-banner", variantClass[variant], className)} role="status">
      <div style={{ flex: 1 }}>{children}</div>
      {onDismiss ? (
        <IconButton aria-label="Dismiss banner" onClick={onDismiss}>
          <X size={14} strokeWidth={1.75} />
        </IconButton>
      ) : null}
    </div>
  );
}
