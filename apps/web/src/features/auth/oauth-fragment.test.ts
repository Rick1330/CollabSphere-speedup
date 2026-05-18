import { describe, expect, it } from "vitest";
import { parseOAuthFragment } from "./oauth-fragment";

describe("parseOAuthFragment", () => {
  it("parses a valid oauth hash", () => {
    const payload = {
      accessToken: "tok",
      csrfToken: "csrf",
      user: { id: "u1", email: "a@b.com", fullName: "A B" },
    };
    const hash = `#oauth=${encodeURIComponent(JSON.stringify(payload))}`;
    expect(parseOAuthFragment(hash)).toEqual(payload);
  });

  it("returns null for malformed hash", () => {
    expect(parseOAuthFragment("#oauth=not-json")).toBeNull();
    expect(parseOAuthFragment("#other=1")).toBeNull();
  });
});
