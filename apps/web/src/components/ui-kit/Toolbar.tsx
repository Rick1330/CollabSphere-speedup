import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Toolbar({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("cs-kit-toolbar", className)} role="toolbar" {...props}>
      {children}
    </div>
  );
}

export function ToolbarGroup({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("cs-kit-toolbar-group", className)} role="group" {...props}>
      {children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <div className="cs-kit-toolbar-separator" role="separator" aria-orientation="vertical" />;
}
