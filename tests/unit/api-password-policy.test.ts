import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { assertPasswordStrength } from "../../apps/api/src/common/auth/password-policy.js";

test("assertPasswordStrength rejects weak passwords", () => {
  assert.throws(
    () => assertPasswordStrength("short"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal((error as AppError).code, "PASSWORD_TOO_WEAK");
      return true;
    },
  );
});

test("assertPasswordStrength accepts complex passwords", () => {
  assert.doesNotThrow(() => assertPasswordStrength("ValidPass9!"));
});
