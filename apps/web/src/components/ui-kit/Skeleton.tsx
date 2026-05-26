import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "./cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: string;
  height?: string;
};

export function Skeleton({ className, width = "100%", height = "var(--space-4)", style, ...props }: SkeletonProps) {
  const merged: CSSProperties = { width, height, ...style };
  return <div className={cn("cs-kit-skeleton", className)} style={merged} aria-hidden {...props} />;
}
