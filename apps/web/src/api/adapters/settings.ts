/**
 * Settings API adapter.
 *
 * Canonical surface for "my account" reads and writes consumed by the
 * settings pages: profile fetch/update, password change, and the
 * `UserProfile` type. Notification preferences live in the notifications
 * adapter so the inbox UI can share that surface.
 */
import { request, ApiError } from "@/api/client";
import { parseApiActionEnvelope, parseApiSingleEnvelope } from "@/api/client/envelope";
import { authSession } from "@/lib/auth-session";

export type AuthProvider = "email" | "google";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  globalRole: "USER" | "ADMIN";
  authProvider: AuthProvider;
}

type MeEnvelopeResource = {
  user?: UserProfile;
};

const toSettingsError = (error: unknown): never => {
  if (error instanceof ApiError) {
    const next = new Error(error.message) as Error & { code?: string };
    next.code = error.code;
    throw next;
  }
  throw error;
};

export async function fetchCurrentUser(): Promise<UserProfile> {
  const payload = await request<unknown>("/users/me");
  const resource = parseApiSingleEnvelope<MeEnvelopeResource>(payload);
  if (!resource.user) {
    throw new Error("Missing user in /users/me response.");
  }
  return resource.user;
}

export async function updateProfile(params: {
  fullName: string;
  bio?: string;
}): Promise<UserProfile> {
  const payload = await request<unknown>("/users/me", {
    method: "PUT",
    body: {
      fullName: params.fullName,
      bio: params.bio?.trim() ? params.bio.trim() : null,
    },
  });
  const resource = parseApiSingleEnvelope<MeEnvelopeResource>(payload);
  if (!resource.user) {
    throw new Error("Missing user in update profile response.");
  }
  return resource.user;
}

/** Keep navbar, dashboard, and settings header in sync after profile save. */
export function applyUserProfileToSession(user: UserProfile): void {
  authSession.patchSession({
    user: {
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
    },
  });
}

export async function changePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<string> {
  try {
    const payload = await request<unknown>("/users/me/password", {
      method: "PUT",
      body: params,
    });
    const action = parseApiActionEnvelope(payload);
    return action.message ?? "Password updated.";
  } catch (error) {
    toSettingsError(error);
  }
}
