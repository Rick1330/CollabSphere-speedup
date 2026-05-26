import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type GapToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

function gapStyle(gap: GapToken): CSSProperties {
  return { gap: `var(--space-${gap})` };
}

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: GapToken;
  children: ReactNode;
};

export function Stack({ gap = 4, className, style, children, ...props }: StackProps) {
  return (
    <div className={cn("cs-kit-stack", className)} style={{ ...gapStyle(gap), ...style }} {...props}>
      {children}
    </div>
  );
}

export type InlineProps = HTMLAttributes<HTMLDivElement> & {
  gap?: GapToken;
  children: ReactNode;
};

export function Inline({ gap = 2, className, style, children, ...props }: InlineProps) {
  return (
    <div className={cn("cs-kit-inline", className)} style={{ ...gapStyle(gap), ...style }} {...props}>
      {children}
    </div>
  );
}
