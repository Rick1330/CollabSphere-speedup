import test from "node:test";
import assert from "node:assert/strict";
import { AuthNestController } from "../../apps/api/src/auth/auth.nest.controller.js";

test("AuthNestController.register wraps success response", async () => {
  const controller = new AuthNestController({
    register: async () => ({ message: "Registration successful. Please verify your email." }),
    verifyEmail: async () => ({ message: "Email verified successfully." }),
  });

  const response = await controller.register(
    {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "Passw0rd!",
      confirmPassword: "Passw0rd!",
    },
    "127.0.0.1",
    "unit-test",
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.data.message, "Registration successful. Please verify your email.");
  assert.equal(response.meta.requestId, "nest-request");
});

test("AuthNestController.verifyEmail wraps success response", async () => {
  const controller = new AuthNestController({
    register: async () => ({ message: "Registration successful. Please verify your email." }),
    verifyEmail: async () => ({ message: "Email verified successfully." }),
  });

  const response = await controller.verifyEmail(
    {
      token: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    "127.0.0.1",
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.message, "Email verified successfully.");
  assert.equal(response.meta.requestId, "nest-request");
});
