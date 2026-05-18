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
const getAccessTokenMock = vi.fn();

vi.mock("@/lib/auth-session", () => ({
  authSession: {
    getAccessToken: getAccessTokenMock,
    patchSession: patchSessionMock,
  },
}));

vi.mock("@/api/client", () => ({
  request: vi.fn(),
  ApiError: class ApiError extends Error {},
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

describe("syncSessionFromApi", () => {
  beforeEach(() => {
    patchSessionMock.mockReset();
    getAccessTokenMock.mockReset();
  });

  it("returns null when there is no access token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const { syncSessionFromApi } = await import("./settings");
    await expect(syncSessionFromApi()).resolves.toBeNull();
  });

  it("patches session when /users/me succeeds", async () => {
    getAccessTokenMock.mockReturnValue("token");
    const { request } = await import("@/api/client");
    vi.mocked(request).mockResolvedValue({
      data: {
        user: {
          id: "u1",
          fullName: "Admin User",
          email: "admin@collabsphere.app",
          bio: null,
          avatarUrl: null,
          globalRole: "ADMIN",
          authProvider: "email",
        },
      },
    });

    const { syncSessionFromApi } = await import("./settings");
    const user = await syncSessionFromApi();

    expect(user?.globalRole).toBe("ADMIN");
    expect(patchSessionMock).toHaveBeenCalledWith({
      user: {
        fullName: "Admin User",
        email: "admin@collabsphere.app",
        avatarUrl: null,
        globalRole: "ADMIN",
      },
    });
  });
});
