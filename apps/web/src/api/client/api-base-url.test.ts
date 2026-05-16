import { describe, expect, it } from "vitest";
import { normalizeDevApiAbsoluteUrl, httpUrlOrigin } from "./index";

describe("normalizeDevApiAbsoluteUrl", () => {
  it("rewrites localhost to 127.0.0.1", () => {
    expect(normalizeDevApiAbsoluteUrl("http://localhost:3001/api/v1")).toBe(
      "http://127.0.0.1:3001/api/v1",
    );
  });

  it("rewrites bracketed IPv6 loopback to 127.0.0.1", () => {
    expect(normalizeDevApiAbsoluteUrl("http://[::1]:3001/api/v1")).toBe(
      "http://127.0.0.1:3001/api/v1",
    );
  });

  it("returns the original string when it is not an absolute URL", () => {
    expect(normalizeDevApiAbsoluteUrl("/api/v1")).toBe("/api/v1");
  });
});

describe("httpUrlOrigin", () => {
  it("strips path for REST base URLs", () => {
    expect(httpUrlOrigin("http://127.0.0.1:3001/api/v1")).toBe("http://127.0.0.1:3001");
  });
});
