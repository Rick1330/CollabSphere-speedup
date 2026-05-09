import { describe, expect, it } from "vitest";
import {
  parseApiActionEnvelope,
  parseApiErrorEnvelope,
  parseApiSingleEnvelope,
} from "./envelope";

describe("api envelope parser", () => {
  it("parses action envelope message and extraData", () => {
    const parsed = parseApiActionEnvelope<{ token: string }>({
      data: { message: "ok", token: "abc" },
      meta: { requestId: "req-1" },
    });
    expect(parsed.message).toBe("ok");
    expect(parsed.extraData.token).toBe("abc");
  });

  it("parses single envelope payload", () => {
    const user = parseApiSingleEnvelope<{ id: string }>({
      data: { id: "u1" },
    });
    expect(user.id).toBe("u1");
  });

  it("parses error envelope", () => {
    const error = parseApiErrorEnvelope({
      error: { code: "INVALID_CREDENTIALS", message: "bad credentials" },
    });
    expect(error).toEqual({ code: "INVALID_CREDENTIALS", message: "bad credentials" });
  });
});
