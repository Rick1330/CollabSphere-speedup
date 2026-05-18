import { describe, expect, it } from "vitest";
import { resolveCommentAuthor, resolveMemberDisplay } from "./comment-author";

describe("resolveCommentAuthor", () => {
  it("prefers snapshot name over member lookup", () => {
    const members = new Map([
      ["user-1", { id: "user-1", fullName: "Wrong Name", avatarUrl: null }],
    ]);
    const resolved = resolveCommentAuthor(
      { id: "user-1", fullName: "Elshaday Tesfaye", avatarUrl: null },
      members,
    );
    expect(resolved.fullName).toBe("Elshaday Tesfaye");
  });

  it("falls back to workspace member when snapshot is unknown", () => {
    const members = new Map([
      ["user-2", { id: "user-2", fullName: "Eyob Bekele", avatarUrl: null }],
    ]);
    const resolved = resolveCommentAuthor(
      { id: "user-2", fullName: "Unknown user", avatarUrl: null },
      members,
    );
    expect(resolved.fullName).toBe("Eyob Bekele");
  });
});

describe("resolveMemberDisplay", () => {
  it("returns member name for resolver id", () => {
    const members = new Map([
      ["user-3", { id: "user-3", fullName: "Yonas Girma", avatarUrl: null }],
    ]);
    expect(resolveMemberDisplay("user-3", members).fullName).toBe("Yonas Girma");
  });
});
