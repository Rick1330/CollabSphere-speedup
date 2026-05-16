import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCreateWorkspaceContent,
  canDeleteWorkspaceContent,
  canOrganizeWorkspaceContent,
} from "./workspace-content-policy.js";

describe("workspace-content-policy", () => {
  it("allows MEMBER to create and organize but not delete", () => {
    assert.equal(canCreateWorkspaceContent("MEMBER"), true);
    assert.equal(canOrganizeWorkspaceContent("MEMBER"), true);
    assert.equal(canDeleteWorkspaceContent("MEMBER"), false);
  });

  it("blocks VIEWER from mutating content", () => {
    assert.equal(canCreateWorkspaceContent("VIEWER"), false);
    assert.equal(canOrganizeWorkspaceContent("VIEWER"), false);
    assert.equal(canDeleteWorkspaceContent("VIEWER"), false);
  });

  it("allows MANAGER to delete", () => {
    assert.equal(canDeleteWorkspaceContent("MANAGER"), true);
  });
});
