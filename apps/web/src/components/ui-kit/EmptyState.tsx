import type { ReactNode } from "react";
import { cn } from "./cn";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("cs-kit-empty", className)}>
      {icon ? <div className="cs-kit-empty-icon">{icon}</div> : null}
      <h2 className="cs-kit-empty-title">{title}</h2>
      {body ? <p className="cs-kit-empty-body">{body}</p> : null}
      {action}
    </div>
  );
}
