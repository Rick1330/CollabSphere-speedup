import test from "node:test";
import assert from "node:assert/strict";
import { HealthNestController } from "../../apps/api/src/health/health.nest.controller.js";

test("HealthNestController returns healthy status envelope", async () => {
  const controller = new HealthNestController({
    runChecks: async () => ({
      status: "healthy",
      checks: {
        database: { status: "healthy", latencyMs: 3 },
        redis: { status: "healthy", latencyMs: 2 },
      },
    }),
  });

  const response = await controller.getHealth();
  assert.equal(response.statusCode, 200);
  assert.equal(response.data.resource.service, "api");
  assert.equal(response.data.resource.status, "healthy");
});

test("HealthNestController returns unhealthy status envelope", async () => {
  const controller = new HealthNestController({
    runChecks: async () => ({
      status: "unhealthy",
      checks: {
        database: { status: "unhealthy", latencyMs: 10, detail: "POSTGRES_TIMEOUT" },
        redis: { status: "healthy", latencyMs: 2 },
      },
    }),
  });

  const response = await controller.getHealth();
  assert.equal(response.statusCode, 503);
  assert.equal(response.data.resource.status, "unhealthy");
});
