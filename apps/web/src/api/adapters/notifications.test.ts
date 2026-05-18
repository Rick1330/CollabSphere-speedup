import { describe, expect, it } from "vitest";
import { resolveNotificationCategory } from "./notifications";

describe("resolveNotificationCategory", () => {
  it("maps comment.mention to comments", () => {
    expect(resolveNotificationCategory("comment.mention")).toBe("comments");
  });

  it("falls back to prefix for unknown types", () => {
    expect(resolveNotificationCategory("comment.future_event")).toBe("comments");
    expect(resolveNotificationCategory("document.future_event")).toBe("documents");
  });
});
