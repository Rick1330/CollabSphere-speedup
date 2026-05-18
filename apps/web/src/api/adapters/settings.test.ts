/**
 * Manual verification (settings profile + password):
 * 1. Sign in as elshaday@collabsphere.app / Demo1234!
 * 2. Settings → Profile: change full name → Save → TopNav, settings header, dashboard update without reload
 * 3. Settings → Password: strength meter on new password; submit only at 4/4
 * 4. Wrong current password → field/banner error
 * 5. Successful change → toast mentions other devices; new password works on next login elsewhere
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const patchSessionMock = vi.fn();

vi.mock("@/lib/auth-session", () => ({
  authSession: {
    patchSession: patchSessionMock,
  },
}));

describe("applyUserProfileToSession", () => {
  beforeEach(() => {
    patchSessionMock.mockReset();
  });

  it("patches session user fields used by useCurrentAccount", async () => {
    const { applyUserProfileToSession } = await import("./settings");

    applyUserProfileToSession({
      id: "u1",
      fullName: "Elshaday Updated",
      email: "elshaday@collabsphere.app",
      bio: null,
      avatarUrl: null,
      globalRole: "USER",
      authProvider: "email",
    });

    expect(patchSessionMock).toHaveBeenCalledWith({
      user: {
        fullName: "Elshaday Updated",
        email: "elshaday@collabsphere.app",
        avatarUrl: null,
        globalRole: "USER",
      },
    });
  });
});
