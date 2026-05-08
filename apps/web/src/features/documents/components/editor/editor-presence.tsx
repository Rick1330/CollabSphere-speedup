import { Link } from "react-router-dom";
import { ArrowUpRight, Circle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getInitials } from "@/lib/format";

export interface PresenceUser {
  id: string;
  fullName: string;
  color: string;
  profileHref: string;
  roleLabel?: string;
  statusLabel?: string;
}

interface EditorPresenceProps {
  users: PresenceUser[];
}

export const EditorPresence = ({ users }: EditorPresenceProps) => {
  if (users.length === 0) return null;

  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex -space-x-1.5"
        aria-label={`${users.length} ${users.length === 1 ? "person" : "people"} viewing`}
      >
        {visible.map((user, i) => (
          <HoverCard key={user.id} openDelay={140} closeDelay={80}>
            <HoverCardTrigger asChild>
              <Link
                to={user.profileHref}
                className="group h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                style={{ backgroundColor: user.color, zIndex: 4 - i }}
                aria-label={`Open profile for ${user.fullName}`}
              >
                {getInitials(user.fullName, 1)}
              </Link>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-0 overflow-hidden border-stone-200 shadow-xl">
              <div className="bg-linear-to-br from-white to-stone-50 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.fullName, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate">{user.fullName}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {user.roleLabel ?? "Collaborator"}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <Circle className="h-2 w-2 fill-current" />
                      {user.statusLabel ?? "Online now"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={user.profileHref}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-500"
                  >
                    View profile
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
        {overflow > 0 && (
          <div
            className="h-6 w-6 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[9px] font-bold text-stone-600"
            style={{ zIndex: 0 }}
            title={`${overflow} more`}
          >
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[11px] text-stone-400 hidden lg:inline">
        {users.length === 1
          ? `${users[0].fullName.split(" ")[0]} viewing`
          : `${users.length} viewing`}
      </span>
    </div>
  );
};
