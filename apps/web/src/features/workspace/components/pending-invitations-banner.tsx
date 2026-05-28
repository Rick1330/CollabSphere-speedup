import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import {
  acceptMyPendingInvitation,
  fetchMyPendingInvitations,
  type AcceptInvitationResult,
} from "@/api/adapters/invitations";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";
import type { WorkspaceRole } from "@/api/adapters/members";

export const PENDING_INVITATIONS_QUERY_KEY = ["invitations", "me", "pending"] as const;

interface PendingInvitationsBannerProps {
  className?: string;
}

export function PendingInvitationsBanner({ className }: PendingInvitationsBannerProps) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => new Set<string>());

  const { data = [], isLoading, isError } = useQuery({
    queryKey: PENDING_INVITATIONS_QUERY_KEY,
    queryFn: fetchMyPendingInvitations,
    staleTime: 45_000,
    retry: 1,
  });

  const visible = data.filter((row) => !dismissed.has(row.id));

  const acceptMutation = useMutation({
    mutationFn: acceptMyPendingInvitation,
    onSuccess: async (result: AcceptInvitationResult, invitationId) => {
      setDismissed((prev) => new Set(prev).add(invitationId));
      toast.success("Invitation accepted", {
        description: "The workspace is now in your list.",
      });
      await queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.mine() });
      if (result.workspaceId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.detail(result.workspaceId),
        });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Could not accept this invitation.";
      toast.error(msg);
    },
  });

  if (isLoading || isError || visible.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-teal-200/80 bg-teal-50/50 px-4 py-3 shadow-sm",
        className,
      )}
      aria-label="Pending workspace invitations"
    >
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-teal-700 shrink-0" />
        <h2 className="text-sm font-semibold text-stone-900">Pending invitations</h2>
      </div>
      <ul className="space-y-2">
        {visible.map((inv) => {
          const roleLabel = getWorkspaceRoleLabel(
            inv.workspace.type as "professional" | "academic" | "general",
            inv.role as WorkspaceRole,
            inv.workspace.roleLabels,
          );
          const expires = new Date(inv.expiresAt);
          return (
            <li
              key={inv.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-white/80 border border-stone-100 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{inv.workspace.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {roleLabel} · Invited by {inv.invitedByFullName}
                  {" · "}
                  Expires {expires.toLocaleDateString()}
                  {" · "}
                  Accept to open this workspace from your list.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-stone-500"
                  onClick={() => setDismissed((prev) => new Set(prev).add(inv.id))}
                  aria-label="Hide invitation"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-teal-600 hover:bg-teal-500"
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(inv.id)}
                >
                  Accept
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
