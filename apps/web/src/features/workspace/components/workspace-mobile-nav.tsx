import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { WorkspaceForSidebar } from "./workspace-sidebar";
import { getWorkspaceNavItems, Lock } from "./workspace-nav-items";

interface WorkspaceMobileNavProps {
  workspace: WorkspaceForSidebar;
}

export const WorkspaceMobileNav = ({ workspace }: WorkspaceMobileNavProps) => {
  const items = getWorkspaceNavItems(workspace);

  return (
    <nav
      aria-label="Workspace navigation"
      className="lg:hidden border-b border-stone-200 bg-[#FAFAF9] dark:bg-stone-950 shrink-0"
    >
      <div className="overflow-x-auto px-3 sm:px-4">
        <ul className="flex gap-2 py-2 min-w-max">
          {items.map((item) => {
            const Icon = item.icon;
            if (item.locked) {
              return (
                <li key={item.to}>
                  <span
                    title={item.lockedTitle}
                    aria-disabled="true"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50 text-stone-400 text-sm font-medium cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                  </span>
                </li>
              );
            }

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1",
                      isActive
                        ? "bg-stone-900 border-stone-900 text-white font-semibold"
                        : "bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 font-medium",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
