import type { TaskAssignee } from "@/api/adapters/tasks";
import { getAvatarColor } from "@/lib/format";
import type { CommentAuthor } from "@/lib/mock-comments";

export type ResolvedCommentAuthor = {
  id: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarColor: string;
};

/** Prefer API snapshot, then live workspace member, then fallback label. */
export function resolveCommentAuthor(
  author: CommentAuthor,
  membersById?: Map<string, TaskAssignee>,
): ResolvedCommentAuthor {
  const member = author.id ? membersById?.get(author.id) : undefined;
  const fullName =
    author.fullName && author.fullName !== "Unknown user"
      ? author.fullName
      : member?.fullName ?? author.fullName ?? "Unknown user";
  const avatarUrl = author.avatarUrl ?? member?.avatarUrl ?? null;
  const id = author.id ?? member?.id ?? null;
  return {
    id,
    fullName,
    avatarUrl,
    avatarColor: id ? getAvatarColor(id) : "#A8A29E",
  };
}

export function resolveMemberDisplay(
  userId: string | null | undefined,
  membersById?: Map<string, TaskAssignee>,
): ResolvedCommentAuthor {
  if (!userId) {
    return {
      id: null,
      fullName: "Unknown user",
      avatarUrl: null,
      avatarColor: "#A8A29E",
    };
  }
  const member = membersById?.get(userId);
  if (member) {
    return {
      id: member.id,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      avatarColor: getAvatarColor(member.id),
    };
  }
  return {
    id: userId,
    fullName: "Unknown user",
    avatarUrl: null,
    avatarColor: getAvatarColor(userId),
  };
}
