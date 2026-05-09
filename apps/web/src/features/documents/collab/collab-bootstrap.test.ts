import { describe, expect, it } from "vitest";
import { mapReadOnlyReasonFromPolicyCode } from "./collab-bootstrap";

describe("collab read-only policy mapping", () => {
  it("maps backend policy codes to editor reasons", () => {
    expect(mapReadOnlyReasonFromPolicyCode("DOCUMENT_LOCKED")).toBe("locked");
    expect(mapReadOnlyReasonFromPolicyCode("DOCUMENT_READONLY_STATUS")).toBe("submitted");
    expect(mapReadOnlyReasonFromPolicyCode("WORKSPACE_ARCHIVED_READONLY")).toBe("workspace-archived");
    expect(mapReadOnlyReasonFromPolicyCode("INSUFFICIENT_ROLE")).toBe("viewer");
  });

  it("returns null for unknown policy code", () => {
    expect(mapReadOnlyReasonFromPolicyCode("UNKNOWN_CODE")).toBeNull();
  });
});
