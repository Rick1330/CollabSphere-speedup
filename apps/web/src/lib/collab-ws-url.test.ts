import { describe, expect, it } from "vitest";
import {
  collabUrlLooksLikeSpaDocumentRoute,
  DEFAULT_COLLAB_WS_URL,
  normalizeCollabWsUrl,
} from "@/lib/collab-ws-url";

describe("normalizeCollabWsUrl", () => {
  it("accepts a normal Hocuspocus-style URL", () => {
    expect(normalizeCollabWsUrl("ws://127.0.0.1:3002")).toBe("ws://127.0.0.1:3002");
    expect(normalizeCollabWsUrl("wss://collab.example.com/collab")).toBe("wss://collab.example.com/collab");
  });

  it("falls back for relative paths", () => {
    expect(
      normalizeCollabWsUrl(
        "/w/e60e7ebf-5a62-4280-be7b-fcbecfeb90cf/documents/a64657b3-c8fa-4c30-afe6-a3393295db05",
      ),
    ).toBe(DEFAULT_COLLAB_WS_URL);
  });

  it("falls back for absolute ws URL that copies the SPA document route (misconfigured env)", () => {
    const bad =
      "ws://127.0.0.1:8080/w/e60e7ebf-5a62-4280-be7b-fcbecfeb90cf/documents/a64657b3-c8fa-4c30-afe6-a3393295db05";
    expect(normalizeCollabWsUrl(bad)).toBe(DEFAULT_COLLAB_WS_URL);
  });

  it("does not reject ws on same host with a non-SPA path", () => {
    expect(normalizeCollabWsUrl("ws://127.0.0.1:8080/collab")).toBe("ws://127.0.0.1:8080/collab");
  });
});

describe("collabUrlLooksLikeSpaDocumentRoute", () => {
  it("detects SPA document pathname", () => {
    expect(
      collabUrlLooksLikeSpaDocumentRoute(
        "ws://127.0.0.1:8080/w/e60e7ebf-5a62-4280-be7b-fcbecfeb90cf/documents/a64657b3-c8fa-4c30-afe6-a3393295db05",
      ),
    ).toBe(true);
  });

  it("returns false for default collab URL", () => {
    expect(collabUrlLooksLikeSpaDocumentRoute(DEFAULT_COLLAB_WS_URL)).toBe(false);
  });
});
