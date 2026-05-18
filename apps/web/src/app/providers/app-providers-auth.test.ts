import { describe, expect, it } from "vitest";
import { authSession } from "@/lib/auth-session";

/** Mirrors `getAuthToken` in `app-providers.tsx` — must not throw ReferenceError. */
function apiBridgeGetAuthToken(): string | null {
  return authSession.getAccessToken();
}

describe("ApiClient auth bridge", () => {
  it("reads access token from authSession without ReferenceError", () => {
    expect(apiBridgeGetAuthToken()).toBeNull();
    authSession.signIn("user-1", { accessToken: "test-token" });
    expect(apiBridgeGetAuthToken()).toBe("test-token");
    authSession.signOut();
    expect(apiBridgeGetAuthToken()).toBeNull();
  });
});
