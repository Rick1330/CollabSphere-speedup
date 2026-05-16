import test from "node:test";
import assert from "node:assert/strict";
import {
  createSignedGoogleOAuthState,
  verifySignedGoogleOAuthState,
} from "../../apps/api/src/auth/google-oauth-state.js";

test("signed Google OAuth state round-trips and rejects tampering", () => {
  const secret = "test-secret-at-least-32-chars-long!!";
  const state = createSignedGoogleOAuthState(secret);
  assert.equal(state.length > 40, true);
  assert.equal(verifySignedGoogleOAuthState(secret, state), true);
  assert.equal(verifySignedGoogleOAuthState(secret, `${state}x`), false);
  assert.equal(verifySignedGoogleOAuthState("wrong-secret", state), false);
});
