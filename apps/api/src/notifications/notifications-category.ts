import type { Prisma } from "@prisma/client";

export const CATEGORY_TYPE_PREFIXES: Record<string, string[]> = {
  tasks: ["task."],
  documents: ["document."],
  comments: ["comment."],
  workspace: ["workspace."],
  deadlines: ["deadline."],
};

export function categoryTypeFilter(category: string): Prisma.NotificationWhereInput | null {
  const prefixes = CATEGORY_TYPE_PREFIXES[category];
  if (!prefixes?.length) return null;
  return {
    OR: prefixes.map((prefix) => ({
      type: { startsWith: prefix },
    })),
  };
}

/** Returns true when `notificationType` matches a UI category filter (e.g. comments → comment.*). */
export function notificationMatchesCategory(
  notificationType: string,
  category: string,
): boolean {
  const prefixes = CATEGORY_TYPE_PREFIXES[category];
  if (!prefixes?.length) return false;
  return prefixes.some((prefix) => notificationType.startsWith(prefix));
}
