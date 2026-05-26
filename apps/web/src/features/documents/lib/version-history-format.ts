import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { DocumentVersion, VersionReason } from "@/api/adapters/documents";
import { REASON_META } from "@/api/adapters/documents";

export function formatVersionTime(createdAt: string): string {
  const date = parseISO(createdAt);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

export function formatVersionGroupLabel(createdAt: string): string {
  const date = parseISO(createdAt);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export function groupVersionsByDay(versions: DocumentVersion[]): Array<{
  label: string;
  versions: DocumentVersion[];
}> {
  const groups = new Map<string, DocumentVersion[]>();
  for (const version of versions) {
    const label = formatVersionGroupLabel(version.createdAt);
    const list = groups.get(label) ?? [];
    list.push(version);
    groups.set(label, list);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, versions: items }));
}

export { formatCharDelta } from "@/features/documents/lib/version-char-delta";

const REASON_BADGE_CLASS: Record<VersionReason, string> = {
  auto: "bg-stone-100 text-stone-600",
  manual: "bg-sky-50 text-sky-700",
  submitted: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  before_restore: "bg-stone-200 text-stone-700",
};

export function reasonBadgeClass(reason: VersionReason): string {
  return REASON_BADGE_CLASS[reason] ?? REASON_BADGE_CLASS.auto;
}

export function reasonBadgeLabel(reason: VersionReason): string {
  return REASON_META[reason]?.label ?? reason;
}

export function formatVersionDetailLabel(version: DocumentVersion): string {
  const time = formatVersionTime(version.createdAt);
  return `Restore to version from ${time} by ${version.createdByName}?`;
}
