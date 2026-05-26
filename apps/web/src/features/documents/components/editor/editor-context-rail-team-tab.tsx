import { Link } from "react-router-dom";
import { ArrowUpRight, Circle, Users } from "lucide-react";
import {
  EditorRailEmptyState,
  EditorRailHeader,
} from "@/features/documents/components/editor/editor-rail-chrome";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import { getInitials } from "@/lib/format";

interface EditorContextRailTeamTabProps {
  users: PresenceUser[];
}

function TeamMemberRow({ user }: { user: PresenceUser }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] p-3 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: user.color }}
        aria-hidden="true"
      >
        {getInitials(user.fullName, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--editor-text-primary)]">
          {user.fullName}
        </p>
        <p className="mt-0.5 text-xs text-[var(--editor-text-muted)]">
          {user.roleLabel ?? "Collaborator"}
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
          {user.statusLabel ?? "Viewing now"}
        </div>
      </div>
      <Link
        to={user.profileHref}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--editor-text-muted)] transition-colors hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-accent-text)]"
        aria-label={`Open profile for ${user.fullName}`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </li>
  );
}

export const EditorContextRailTeamTab = ({ users }: EditorContextRailTeamTabProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorRailHeader
        title="Team"
        subtitle={
          users.length === 0
            ? "No one else is here"
            : `${users.length} ${users.length === 1 ? "person" : "people"} in this document`
        }
        icon={Users}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {users.length === 0 ? (
          <EditorRailEmptyState
            icon={Users}
            title="You're working solo"
            description="When teammates open this document, they will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <TeamMemberRow key={user.id} user={user} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
