import { Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

@Injectable()
export class GoogleOAuthService {
  isConfigured(): boolean {
    const id = process.env.GOOGLE_CLIENT_ID?.trim();
    const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    return Boolean(id && secret);
  }

  buildAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new AppError({
        code: "SERVICE_UNAVAILABLE",
        message: "Google OAuth is not configured",
      });
    }
    const redirectUri = `${apiRuntimeEnv.API_BASE_URL}/api/v1/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<{
    sub: string;
    email: string;
    fullName: string;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new AppError({
        code: "SERVICE_UNAVAILABLE",
        message: "Google OAuth is not configured",
      });
    }
    const redirectUri = `${apiRuntimeEnv.API_BASE_URL}/api/v1/auth/google/callback`;
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    let tokenRes: Response;
    try {
      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth][google] token endpoint unreachable", err);
      }
      throw new AppError({
        code: "OAUTH_INVALID_CALLBACK",
        message: "Failed to reach Google token endpoint",
        cause: err instanceof Error ? err : undefined,
      });
    }
    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth][google] token exchange failed", {
          status: tokenRes.status,
          redirectUri,
          body: errorBody.slice(0, 500),
        });
      }
      throw new AppError({
        code: "OAUTH_INVALID_CALLBACK",
        message: "Failed to exchange Google authorization code",
      });
    }
    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new AppError({
        code: "OAUTH_INVALID_CALLBACK",
        message: "Google token response missing access_token",
      });
    }
    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      const errorBody = await userRes.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth][google] userinfo failed", {
          status: userRes.status,
          body: errorBody.slice(0, 500),
        });
      }
      throw new AppError({
        code: "OAUTH_INVALID_CALLBACK",
        message: "Failed to load Google profile",
      });
    }
    const profile = (await userRes.json()) as GoogleUserInfo;
    const sub = typeof profile.sub === "string" ? profile.sub : "";
    const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
    const fullName = typeof profile.name === "string" ? profile.name : email.split("@")[0] ?? "User";
    if (!sub || !email) {
      throw new AppError({
        code: "OAUTH_INVALID_CALLBACK",
        message: "Google profile is missing required fields",
      });
    }
    if (profile.email_verified === false) {
      throw new AppError({
        code: "EMAIL_NOT_VERIFIED",
        message: "Google email is not verified",
      });
    }
    return { sub, email, fullName };
  }
}
