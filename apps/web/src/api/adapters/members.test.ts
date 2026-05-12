import { describe, it, expect, vi } from "vitest";
import * as apiClient from "@/api/client";
import {
  fetchMembers,
  fetchPendingInvitations,
  inviteMember,
  revokeInvitation,
  getAssignableRoles,
  getRoleLabel,
  sortMembers,
  type WorkspaceMember,
  type WorkspaceRole,
} from "./members";

const mkMember = (
  membershipId: string,
  fullName: string,
  role: WorkspaceRole,
): WorkspaceMember => ({
  membershipId,
  user: { id: membershipId, fullName, email: `${membershipId}@x.dev`, avatarUrl: null },
  role,
  roleLabel: getRoleLabel(role),
  joinedAt: new Date().toISOString(),
  lastAccessedAt: null,
});

describe("api/adapters/members", () => {
  it("getAssignableRoles enforces the documented role policy", () => {
    // Owner can promote up to Admin but cannot mint another Owner here.
    expect(getAssignableRoles("OWNER")).toEqual(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);
    // Admin cannot create another Admin or an Owner.
    expect(getAssignableRoles("ADMIN")).toEqual(["MANAGER", "MEMBER", "VIEWER"]);
    // Lower roles cannot reassign at all.
    expect(getAssignableRoles("MANAGER")).toEqual([]);
    expect(getAssignableRoles("MEMBER")).toEqual([]);
    expect(getAssignableRoles("VIEWER")).toEqual([]);
  });

  it("sortMembers orders by role rank then by name (locale-aware)", () => {
    const sorted = sortMembers([
      mkMember("m4", "Bethel", "MEMBER"),
      mkMember("m1", "Yonas", "OWNER"),
      mkMember("m3", "Eyob", "MANAGER"),
      mkMember("m2", "Hiwot", "ADMIN"),
      mkMember("m5", "Aaron", "MEMBER"),
    ]);
    expect(sorted.map((m) => m.user.fullName)).toEqual([
      "Yonas", // OWNER
      "Hiwot", // ADMIN
      "Eyob", // MANAGER
      "Aaron", // MEMBER, alphabetical
      "Bethel", // MEMBER, alphabetical
    ]);
  });

  it("fetchMembers maps live API payload", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "mem-1",
            role: "OWNER",
            joinedAt: "2026-01-01T00:00:00.000Z",
            lastAccessedAt: "2026-01-02T00:00:00.000Z",
            user: {
              id: "user-1",
              fullName: "Owner User",
              email: "owner@example.com",
              avatarUrl: null,
            },
          },
        ],
      },
    } as never);
    const res = await fetchMembers("ws-1");
    expect(res.data.items[0]?.membershipId).toBe("mem-1");
    expect(res.data.items[0]?.role).toBe("OWNER");
    requestSpy.mockRestore();
  });

  it("fetchPendingInvitations maps workspace invitations endpoint", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "inv-1",
            email: "new.user@example.com",
            role: "MEMBER",
            invitedById: "user-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            expiresAt: "2999-01-01T00:00:00.000Z",
          },
        ],
      },
    } as never);
    const pending = await fetchPendingInvitations("ws-1");
    expect(pending.data.items[0]?.id).toBe("inv-1");
    expect(pending.data.items[0]?.status).toBe("pending");
    requestSpy.mockRestore();
  });

  it("inviteMember and revokeInvitation call live invitation endpoints", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValue({} as never);
    await inviteMember("ws-1", { email: "new.user@example.com", role: "MEMBER" }, "OWNER");
    await revokeInvitation("ws-1", "inv-1", "OWNER");
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/workspaces/ws-1/invitations",
      expect.objectContaining({ method: "POST" }),
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/workspaces/ws-1/invitations/inv-1/revoke",
      expect.objectContaining({ method: "POST" }),
    );
    requestSpy.mockRestore();
  });
});
