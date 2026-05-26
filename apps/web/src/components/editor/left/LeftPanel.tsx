import type { ReactNode } from "react";
import { cn } from "@/components/ui-kit";

export type LeftPanelProps = {
  children: ReactNode;
  className?: string;
};

export function LeftPanel({ children, className }: LeftPanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}
