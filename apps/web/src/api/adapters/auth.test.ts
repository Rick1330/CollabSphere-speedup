import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const parseActionMock = vi.fn();
const parseSingleMock = vi.fn();

vi.mock("@/api/client", () => ({
  ApiError: class extends Error {
    code?: string;
  },
  request: requestMock,
}));

vi.mock("@/api/client/envelope", () => ({
  parseApiActionEnvelope: parseActionMock,
  parseApiSingleEnvelope: parseSingleMock,
}));

vi.mock("@/lib/auth-session", () => ({
  authSession: {
    signIn: signInMock,
    signOut: signOutMock,
  },
}));

describe("api/adapters/auth wiring", () => {
  beforeEach(() => {
    requestMock.mockReset();
    parseActionMock.mockReset();
    parseSingleMock.mockReset();
    signInMock.mockReset();
    signOutMock.mockReset();
  });

  it("hits login endpoint and persists session", async () => {
    requestMock.mockResolvedValue({ ok: true });
    parseActionMock.mockReturnValue({
      extraData: {
        accessToken: "access-token-1",
        user: {
          id: "u1",
          email: "user@example.com",
          fullName: "User",
          globalRole: "USER",
        },
      },
    });
    const { login } = await import("./auth");

    const session = await login({ email: "user@example.com", password: "Pass#1234" });

    expect(requestMock).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: { email: "user@example.com", password: "Pass#1234" },
    });
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(session.accessToken).toBe("access-token-1");
  });

  it("uses register/forgot/reset/verify/me API routes", async () => {
    requestMock.mockResolvedValue({});
    parseSingleMock.mockReturnValue({
      id: "u1",
      email: "user@example.com",
      fullName: "User",
      globalRole: "USER",
    });
    const { register, requestPasswordReset, resetPassword, verifyEmail, getCurrentUser } =
      await import("./auth");

    await register({ email: "new@example.com", fullName: "New User", password: "Pass#1234" });
    await requestPasswordReset({ email: "new@example.com" });
    await resetPassword({ token: "token-1", password: "Pass#1234" });
    await verifyEmail("verify-token-1");
    await getCurrentUser();

    expect(requestMock).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ method: "POST" }));
    expect(requestMock).toHaveBeenCalledWith("/auth/forgot-password", expect.objectContaining({ method: "POST" }));
    expect(requestMock).toHaveBeenCalledWith("/auth/reset-password", expect.objectContaining({ method: "POST" }));
    expect(requestMock).toHaveBeenCalledWith("/auth/verify-email", expect.objectContaining({ method: "POST" }));
    expect(requestMock).toHaveBeenCalledWith("/users/me");
  });
});
