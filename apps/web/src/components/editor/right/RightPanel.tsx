import type { ReactNode } from "react";
import { cn } from "@/components/ui-kit";

export type RightPanelProps = {
  children: ReactNode;
  className?: string;
};

export function RightPanel({ children, className }: RightPanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}
