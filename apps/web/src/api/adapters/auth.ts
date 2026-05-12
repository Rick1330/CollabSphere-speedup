import type { SessionContract, UserContract } from "@/api/contracts";
import { ApiError, request } from "@/api/client";
import { parseApiActionEnvelope, parseApiSingleEnvelope } from "@/api/client/envelope";
import { authSession } from "@/lib/auth-session";

type AuthProvider = "email" | "google";

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CREDENTIALS"
      | "EMAIL_NOT_VERIFIED"
      | "ACCOUNT_DISABLED"
      | "PROVIDER_MISMATCH"
      | "EMAIL_TAKEN"
      | "UNAUTHORIZED"
      | "RATE_LIMITED"
      | "TOKEN_EXPIRED"
      | "TOKEN_INVALID"
      | "TOKEN_ALREADY_USED"
      | "VALIDATION_ERROR"
      | "UNKNOWN_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

type AuthApiUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  globalRole: "USER" | "ADMIN";
  authProvider?: AuthProvider;
  isVerified?: boolean;
};

function toUserContract(profile: AuthApiUser): UserContract {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    role: profile.globalRole === "ADMIN" ? "admin" : "member",
  };
}

function toSession(accessToken: string, user: AuthApiUser): SessionContract {
  return {
    user: toUserContract(user),
    accessToken,
    refreshToken: "",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  };
}

function parseAuthError(error: unknown): never {
  if (error instanceof ApiError) {
    throw new AuthError(
      (error.code as AuthError["code"] | undefined) ?? "UNKNOWN_ERROR",
      error.message || "Authentication request failed.",
    );
  }
  throw error;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<SessionContract> {
  try {
    const payload = await request<unknown>("/auth/login", {
      method: "POST",
      body: { email: input.email, password: input.password },
    });
    const { extraData } = parseApiActionEnvelope<{ accessToken: string; user: AuthApiUser }>(payload);
    const accessToken = extraData.accessToken;
    const user = extraData.user;
    if (!accessToken || !user?.id) {
      throw new Error("Invalid auth login response payload.");
    }
    authSession.signIn(user.id, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        globalRole: user.globalRole,
      },
    });
    return toSession(accessToken, user);
  } catch (error) {
    parseAuthError(error);
  }
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<SessionContract> {
  try {
    await request<unknown>("/auth/register", {
      method: "POST",
      body: {
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        confirmPassword: input.password,
      },
    });
    return {
      user: {
        id: "pending-verification",
        email: input.email,
        fullName: input.fullName,
        role: "member",
      },
      accessToken: "",
      refreshToken: "",
      expiresAt: new Date().toISOString(),
    };
  } catch (error) {
    parseAuthError(error);
  }
}

export async function requestPasswordReset(input: { email: string }): Promise<void> {
  try {
    await request<unknown>("/auth/forgot-password", {
      method: "POST",
      body: input,
    });
  } catch (error) {
    parseAuthError(error);
  }
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  try {
    await request<unknown>("/auth/reset-password", {
      method: "POST",
      body: input,
    });
  } catch (error) {
    parseAuthError(error);
  }
}

export async function verifyEmail(token: string): Promise<{ verified: true }> {
  try {
    await request<unknown>("/auth/verify-email", {
      method: "POST",
      body: { token },
    });
    return { verified: true };
  } catch (error) {
    parseAuthError(error);
  }
}

export async function getCurrentUser(): Promise<UserContract> {
  try {
    const payload = await request<unknown>("/users/me");
    const body = parseApiSingleEnvelope<{ user?: AuthApiUser }>(payload);
    if (!body.user) {
      throw new Error("Missing user in /users/me response.");
    }
    return toUserContract(body.user);
  } catch (error) {
    parseAuthError(error);
  }
}

export async function getCollabToken(input: {
  workspaceId: string;
  documentId: string;
}): Promise<{ token: string; expiresInSeconds: number }> {
  try {
    const payload = await request<unknown>("/auth/collab-token", {
      method: "POST",
      body: input,
    });
    const { extraData } = parseApiActionEnvelope<{ token: string; expiresInSeconds: number }>(payload);
    if (!extraData.token) {
      throw new Error("Missing collab token in API response.");
    }
    return {
      token: extraData.token,
      expiresInSeconds: extraData.expiresInSeconds ?? 0,
    };
  } catch (error) {
    parseAuthError(error);
  }
}

export async function logout(): Promise<void> {
  try {
    await request<unknown>("/auth/logout", {
      method: "POST",
    });
  } catch {
    // Sign out locally even if server logout fails.
  }
  authSession.signOut();
}
