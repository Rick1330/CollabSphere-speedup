import { History, Loader2 } from "lucide-react";
import {
  EditorRailEmptyState,
  EditorRailHeader,
} from "@/features/documents/components/editor/editor-rail-chrome";
import type { ActivityEvent } from "@/api/adapters/activity";
import { getInitials, relativeTime } from "@/lib/format";

interface EditorContextRailActivityTabProps {
  events: ActivityEvent[];
  isLoading: boolean;
  currentUserId: string;
}

function formatActorLabel(event: ActivityEvent, currentUserId: string): string {
  if (event.actor.id === currentUserId) return "You";
  return event.actor.fullName.split(" ")[0] ?? event.actor.fullName;
}

function ActivityRow({
  event,
  currentUserId,
}: {
  event: ActivityEvent;
  currentUserId: string;
}) {
  const actorLabel = formatActorLabel(event, currentUserId);
  const isYou = event.actor.id === currentUserId;

  return (
    <li className="flex items-start gap-2.5 py-2.5">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--editor-accent-lighter)] text-[10px] font-bold text-[var(--editor-accent-text)]"
        aria-hidden="true"
      >
        {getInitials(isYou ? "You" : event.actor.fullName, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed text-[var(--editor-text-primary)]">
          <span className="font-semibold">{actorLabel}</span>{" "}
          <span className="text-[var(--editor-text-secondary)]">{event.summary}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--editor-text-muted)]">
          {relativeTime(event.createdAt)}
        </p>
      </div>
    </li>
  );
}

export const EditorContextRailActivityTab = ({
  events,
  isLoading,
  currentUserId,
}: EditorContextRailActivityTabProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorRailHeader
        title="ACTIVITY"
        subtitle={
          isLoading
            ? "Loading…"
            : events.length === 0
              ? "No recent events"
              : `${events.length} events`
        }
        icon={History}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--editor-accent-text)]" />
          </div>
        ) : events.length === 0 ? (
          <EditorRailEmptyState
            icon={History}
            title="No activity yet"
            description="Edits, comments, and submissions for this document will show up here."
          />
        ) : (
          <ul className="divide-y divide-[var(--editor-border)]">
            {events.map((event) => (
              <ActivityRow key={event.id} event={event} currentUserId={currentUserId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
