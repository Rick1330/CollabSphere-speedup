import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, canManageMember } from "../../apps/api/src/workspaces/workspaces.policy.js";

describe("workspaces.policy", () => {
  it("allows owner to manage every non-owner member", () => {
    assert.equal(canManageMember({ actorRole: "OWNER", targetRole: "ADMIN" }), true);
    assert.equal(canManageMember({ actorRole: "OWNER", targetRole: "OWNER" }), false);
  });

  it("restricts admin from managing owner/admin", () => {
    assert.equal(canManageMember({ actorRole: "ADMIN", targetRole: "MANAGER" }), true);
    assert.equal(canManageMember({ actorRole: "ADMIN", targetRole: "ADMIN" }), false);
    assert.equal(canManageMember({ actorRole: "ADMIN", targetRole: "OWNER" }), false);
  });

  it("enforces role assignment boundaries", () => {
    assert.equal(canAssignRole({ actorRole: "OWNER", targetRole: "ADMIN" }), true);
    assert.equal(canAssignRole({ actorRole: "ADMIN", targetRole: "MANAGER" }), true);
    assert.equal(canAssignRole({ actorRole: "ADMIN", targetRole: "ADMIN" }), false);
    assert.equal(canAssignRole({ actorRole: "OWNER", targetRole: "OWNER" }), false);
  });
});
