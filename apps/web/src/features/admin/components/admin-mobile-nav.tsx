import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/features/admin/components/admin-nav";

export const AdminMobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Admin navigation" className="md:hidden border-b border-stone-200 bg-white">
      <div className="overflow-x-auto px-4 sm:px-6">
        <ul className="flex gap-2 py-2 min-w-max">
          {ADMIN_NAV.map((item) => {
            const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1",
                    isActive
                      ? "bg-red-600 border-red-600 text-white font-semibold"
                      : "bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 font-medium",
                  )}
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
