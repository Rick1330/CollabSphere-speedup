import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  authSession,
  hydrateCsrfTokenFromCookie,
  readCsrfTokenFromDocumentCookie,
} from "@/lib/auth-session";

describe("auth session CSRF hydration", () => {
  beforeEach(() => {
    authSession.signOut();
    document.cookie = "csrf_token=; path=/; max-age=0";
  });

  afterEach(() => {
    authSession.signOut();
    document.cookie = "csrf_token=; path=/; max-age=0";
  });

  it("reads csrf_token from document.cookie", () => {
    document.cookie = "csrf_token=test-csrf-value-12345678; path=/";
    expect(readCsrfTokenFromDocumentCookie()).toBe("test-csrf-value-12345678");
  });

  it("hydrates missing session csrf from cookie", () => {
    document.cookie = "csrf_token=hydrated-csrf-token-abcdefgh; path=/";
    authSession.signIn("user-1", { accessToken: "access-only" });
    hydrateCsrfTokenFromCookie();
    expect(authSession.getCsrfToken()).toBe("hydrated-csrf-token-abcdefgh");
  });
});
