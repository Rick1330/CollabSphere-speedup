import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorRailShellProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  showAccentStrip?: boolean;
}

export const EditorRailShell = ({
  children,
  className,
  "aria-label": ariaLabel,
  showAccentStrip = false,
}: EditorRailShellProps) => (
  <aside
    aria-label={ariaLabel}
    className={cn(
      "editor-rail flex h-full min-w-0 flex-col overflow-hidden border-[var(--border-subtle)]",
      className,
    )}
  >
    {showAccentStrip && <div className="editor-rail-accent-strip" aria-hidden="true" />}
    {children}
  </aside>
);

export interface EditorRailTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface EditorRailTabsProps {
  tabs: EditorRailTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
}

export const EditorRailTabs = ({
  tabs,
  activeId,
  onChange,
  className,
  "aria-label": ariaLabel = "Panel tabs",
}: EditorRailTabsProps) => {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeId),
  );

  return (
    <div
      className={cn("shrink-0 px-2 pt-2 pb-1.5", className)}
      role="tablist"
      aria-label={ariaLabel}
      style={
        {
          "--editor-rail-tab-count": tabs.length,
          "--editor-rail-tab-index": activeIndex,
        } as CSSProperties
      }
    >
      <div className="editor-rail-tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "editor-rail-tab flex min-h-[36px] flex-row items-center justify-center gap-1.5 rounded-md px-2 py-2 transition-colors",
                active
                  ? "text-[var(--editor-accent-text)]"
                  : "text-[var(--editor-text-muted)] hover:text-[var(--editor-text-secondary)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate text-xs font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface EditorRailHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  className?: string;
}

export const EditorRailHeader = ({
  title,
  subtitle,
  icon: Icon,
  trailing,
  className,
}: EditorRailHeaderProps) => (
  <div className={cn("editor-rail-header flex shrink-0 items-start justify-between gap-3 px-4 py-3", className)}>
    <div className="flex min-w-0 items-start gap-2.5">
      {Icon && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--brand-100)] bg-[var(--editor-accent-lighter)] text-[var(--editor-accent-text)]"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--editor-text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-[var(--editor-text-muted)]">{subtitle}</p>
        )}
      </div>
    </div>
    {trailing}
  </div>
);

interface EditorRailSectionProps {
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
}

export const EditorRailSection = ({
  title,
  count,
  children,
  className,
}: EditorRailSectionProps) => (
  <section className={cn("px-4 py-3", className)}>
    <div className="mb-2.5 flex items-center gap-2">
      <h3 className="text-xs font-semibold text-[var(--editor-text-secondary)]">{title}</h3>
      {count !== undefined && (
        <span className="rounded-full bg-[var(--editor-accent-lighter)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--editor-accent-text)]">
          {count}
        </span>
      )}
    </div>
    {children}
  </section>
);

interface EditorMetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "hero" | "compact";
  className?: string;
}

export const EditorMetricCard = ({
  label,
  value,
  icon: Icon,
  variant = "compact",
  className,
}: EditorMetricCardProps) => (
  <div
    className={cn(
      "rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] p-3 shadow-sm",
      variant === "hero" && "p-4",
      className,
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[var(--editor-accent-lighter)] text-[var(--editor-accent-text)]",
          variant === "hero" ? "h-10 w-10" : "h-8 w-8",
        )}
      >
        <Icon className={cn(variant === "hero" ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
      </div>
    </div>
    <p
      className={cn(
        "mt-2 tabular-nums font-semibold text-[var(--editor-text-primary)]",
        variant === "hero" ? "text-2xl tracking-tight" : "text-lg",
      )}
    >
      {value}
    </p>
    <p className="mt-0.5 text-xs text-[var(--editor-text-muted)]">{label}</p>
  </div>
);

interface EditorRailSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}

export const EditorRailSearch = ({
  value,
  onChange,
  placeholder = "Search…",
  "aria-label": ariaLabel = "Search",
  className,
}: EditorRailSearchProps) => (
  <div className={cn("relative", className)}>
    <Search
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--editor-text-placeholder)]"
      aria-hidden="true"
    />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="h-10 w-full rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] pl-10 pr-3 text-sm text-[var(--editor-text-primary)] shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-[var(--editor-text-placeholder)] focus:border-[var(--brand-400)] focus:ring-2 focus:ring-[var(--brand-500)]/15"
    />
  </div>
);

interface EditorRailEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EditorRailEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EditorRailEmptyStateProps) => (
  <div className={cn("px-4 py-10 text-center", className)}>
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--brand-100)] bg-[var(--editor-accent-lighter)] shadow-sm">
      <Icon className="h-5 w-5 text-[var(--editor-accent-text)]" aria-hidden="true" />
    </div>
    <h3 className="text-sm font-semibold text-[var(--editor-text-primary)]">{title}</h3>
    {description && (
      <p className="mx-auto mt-1.5 max-w-[220px] text-xs leading-relaxed text-[var(--editor-text-muted)]">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

interface EditorRailCountChipProps {
  children: ReactNode;
  className?: string;
}

export const EditorRailCountChip = ({ children, className }: EditorRailCountChipProps) => (
  <span
    className={cn(
      "rounded-full bg-[var(--editor-accent-lighter)] px-2.5 py-1 text-xs font-medium text-[var(--editor-accent-text)]",
      className,
    )}
  >
    {children}
  </span>
);
