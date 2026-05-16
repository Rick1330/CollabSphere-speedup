import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Briefcase,
  Bell,
  Settings,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";

interface RecentWorkspace {
  id: string;
  name: string;
  type: "professional" | "academic" | "general";
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workspaces", label: "Workspaces", icon: Briefcase },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

const dotColor = (t: RecentWorkspace["type"]) =>
  t === "professional"
    ? "bg-teal-500"
    : t === "academic"
    ? "bg-amber-500"
    : "bg-stone-400";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  width?: number;
  onResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "h-14 flex items-center border-b border-stone-200/70 dark:border-stone-800",
        collapsed ? "justify-center px-2" : "px-4",
      )}
    >
      {collapsed ? (
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600 text-xs font-bold text-white shadow-sm">
          CS
        </div>
      ) : (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-50">CollabSphere</span>
          <span className="mt-0.5 font-mono text-[10px] tracking-[0.15em] text-stone-400 dark:text-stone-500">
            WORKSPACE HUB
          </span>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  return (
    <ul className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg text-sm transition-colors duration-150",
                  collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                  isActive
                    ? "border-l-2 border-teal-600 bg-teal-50 font-semibold text-teal-700 dark:border-teal-400 dark:bg-teal-950/35 dark:text-teal-200"
                    : "text-stone-500 font-medium hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/70 dark:hover:text-stone-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAFAF9] dark:focus-visible:ring-offset-[#171412]",
                )
              }
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function RecentWorkspacesNav({ variant }: { variant: "desktop" | "mobile" }) {
  const { data: rows, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sidebar", "recent-workspaces"],
    queryFn: listMineWorkspaceRows,
    staleTime: 60_000,
  });

  const recent: RecentWorkspace[] = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows]
      .sort(
        (a, b) =>
          new Date(b.workspace.updatedAt).getTime() - new Date(a.workspace.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map((r) => ({
        id: r.workspace.id,
        name: r.workspace.name,
        type: r.workspace.type,
      }));
  }, [rows]);

  const rowClass =
    variant === "mobile"
      ? "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100"
      : "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-stone-600 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAFAF9] dark:focus-visible:ring-offset-[#171412]";

  const newWorkspaceClass =
    variant === "mobile"
      ? "flex items-center gap-2.5 px-3 py-1.5 text-sm text-stone-400 hover:text-teal-600"
      : "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-stone-400 transition-colors duration-150 hover:text-teal-600 dark:text-stone-500 dark:hover:text-teal-400";

  return (
    <ul className="px-3 space-y-0.5">
      {isLoading ? (
        <>
          {[1, 2, 3].map((i) => (
            <li key={i} className="py-0.5">
              <Skeleton className="h-8 w-full rounded-lg" />
            </li>
          ))}
        </>
      ) : isError ? (
        <li className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
          Could not load workspaces.{" "}
          <button
            type="button"
            className="font-medium text-teal-600 hover:underline disabled:opacity-50"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            Retry
          </button>
        </li>
      ) : recent.length === 0 ? (
        <li className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          <p>No workspaces yet.</p>
          <Link to="/workspaces" className="font-medium text-teal-600 hover:underline mt-1 inline-block">
            Browse workspaces
          </Link>
        </li>
      ) : (
        recent.map((w) => (
          <li key={w.id}>
            <Link to={`/w/${w.id}`} className={rowClass}>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(w.type))} aria-hidden="true" />
              <span className="truncate">{w.name}</span>
            </Link>
          </li>
        ))
      )}
      <li>
        <Link to="/workspaces/new" className={newWorkspaceClass}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New workspace
        </Link>
      </li>
    </ul>
  );
}

function SidebarRecentWorkspaces() {
  return (
    <div className="mt-6">
      <div className="mb-2 px-6 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
        Recent workspaces
      </div>
      <RecentWorkspacesNav variant="desktop" />
    </div>
  );
}

function SidebarToggle({ collapsed, onToggle }: AppSidebarProps) {
  const icon = collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />;
  return (
    <div className={cn("border-t border-stone-200/70 p-2 dark:border-stone-800", collapsed ? "flex justify-center" : "px-3 py-2")}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 rounded-lg text-stone-400 transition-colors duration-150 text-xs hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800/70 dark:hover:text-stone-100",
          collapsed ? "h-8 w-8 justify-center" : "h-8 px-2 w-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAFAF9] dark:focus-visible:ring-offset-[#171412]",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
      >
        {icon}
        {!collapsed && (
          <>
            <span>Collapse</span>
            <kbd className="ml-auto inline-flex h-4 items-center justify-center rounded border border-stone-200 bg-white px-1 font-mono text-[10px] text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
              ⌘B
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}

export const AppSidebar = ({ collapsed, onToggle, width = 260, onResizeStart }: AppSidebarProps) => {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 shrink-0",
        "border-r border-stone-200 bg-linear-to-b from-[#FAFAF9] to-[#F3EEE6] dark:border-stone-800 dark:from-[#171412] dark:to-[#201B17]",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : undefined,
      )}
      style={{ width: collapsed ? 60 : width, minWidth: collapsed ? 60 : width }}
      aria-label="Primary navigation"
    >
      <SidebarBrand collapsed={collapsed} />

      <nav className="flex-1 overflow-y-auto py-3">
        <SidebarNav collapsed={collapsed} />
        {!collapsed && <SidebarRecentWorkspaces />}
      </nav>

      <SidebarToggle collapsed={collapsed} onToggle={onToggle} />

      {onResizeStart && !collapsed && (
        <div className="absolute right-0 top-0 h-full w-3 translate-x-1/2 flex items-center justify-center">
          <Separator orientation="vertical" className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-transparent hover:bg-teal-300 dark:hover:bg-teal-500/60" />
          <button
            type="button"
            onPointerDown={onResizeStart}
            aria-label="Resize sidebar"
            title="Resize sidebar"
            className="relative z-10 h-full w-full cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-teal-500/10 dark:hover:bg-teal-400/10"
          />
        </div>
      )}
    </aside>
  );
};

// Mobile sidebar wrapped in a Sheet — exported separately
export const MobileSidebarContent = () => {
  const [, force] = useState(0);
  return (
    <div className="flex h-full flex-col bg-linear-to-b from-[#FAFAF9] to-[#F3EEE6] dark:from-[#171412] dark:to-[#201B17]">
      <div className="h-14 flex items-center border-b border-stone-200 px-4 dark:border-stone-800">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-50">CollabSphere</span>
          <span className="mt-0.5 font-mono text-[10px] tracking-[0.15em] text-stone-400 dark:text-stone-500">WORKSPACE HUB</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3" onClick={() => force((n) => n + 1)}>
        <ul className="space-y-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/dashboard"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "text-teal-700 bg-teal-50 font-semibold border-l-2 border-teal-600"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-100 font-medium",
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <div className="mb-2 px-6 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
            Recent workspaces
          </div>
          <RecentWorkspacesNav variant="mobile" />
        </div>
      </nav>
    </div>
  );
};
