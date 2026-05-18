import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/client", () => ({
  resolveRealtimeSocketOrigin: () => "http://127.0.0.1:3001",
}));

import { getRealtimeNamespaceUrlForTests } from "./socket-client";

describe("socket-client namespace", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("connects to the /realtime namespace URL", () => {
    expect(getRealtimeNamespaceUrlForTests()).toBe("http://127.0.0.1:3001/realtime");
  });
});
