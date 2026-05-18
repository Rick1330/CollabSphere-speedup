import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { AppError, ValidationAppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { executePasswordChange } from "../../apps/api/src/users/change-password.logic.js";

const currentHash = bcrypt.hashSync("Demo1234!", 4);

test("executePasswordChange rejects weak new password", async () => {
  await assert.rejects(
    () =>
      executePasswordChange(
        {
          bcryptCost: 4,
          findUser: async () => ({ passwordHash: currentHash }),
          updatePasswordHash: async () => {},
          revokeRefreshTokens: async () => {},
        },
        "user-1",
        { currentPassword: "Demo1234!", newPassword: "weakpass" },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ValidationAppError);
      return true;
    },
  );
});

test("executePasswordChange rejects same password as current", async () => {
  await assert.rejects(
    () =>
      executePasswordChange(
        {
          bcryptCost: 4,
          findUser: async () => ({ passwordHash: currentHash }),
          updatePasswordHash: async () => {},
          revokeRefreshTokens: async () => {},
        },
        "user-1",
        { currentPassword: "Demo1234!", newPassword: "Demo1234!" },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "PASSWORD_SAME_AS_CURRENT");
      return true;
    },
  );
});

test("executePasswordChange accepts valid change and revokes refresh tokens", async () => {
  let updatedPasswordHash: string | null = null;
  let revoked = false;

  const result = await executePasswordChange(
    {
      bcryptCost: 4,
      findUser: async () => ({ passwordHash: currentHash }),
      updatePasswordHash: async (_userId, passwordHash) => {
        updatedPasswordHash = passwordHash;
      },
      revokeRefreshTokens: async () => {
        revoked = true;
      },
    },
    "user-1",
    { currentPassword: "Demo1234!", newPassword: "NewPass9!" },
  );

  assert.match(result.message, /Password updated/i);
  assert.ok(updatedPasswordHash);
  assert.ok(await bcrypt.compare("NewPass9!", updatedPasswordHash!));
  assert.equal(revoked, true);
});
