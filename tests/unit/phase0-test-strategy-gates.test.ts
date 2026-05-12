import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ciWorkflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");
const strategyManifestPath = path.join(
  repoRoot,
  "tests",
  "phase0",
  "test-strategy-minimum-gates.json",
);

type CiWorkflow = {
  jobs?: Record<string, unknown>;
};

test("Phase 0 minimum CI gates are present", async () => {
  const workflow = parse(await readFile(ciWorkflowPath, "utf8")) as CiWorkflow;
  const strategy = JSON.parse(await readFile(strategyManifestPath, "utf8")) as {
    minimumCiGates: string[];
  };
  const jobNames = Object.keys(workflow.jobs ?? {});

  for (const requiredJob of strategy.minimumCiGates) {
    assert.ok(
      jobNames.includes(requiredJob),
      `CI workflow is missing required Phase 0 gate job: ${requiredJob}`,
    );
  }
});

test("Phase 0 minimum guardrail test suites are declared and present", async () => {
  const strategy = JSON.parse(await readFile(strategyManifestPath, "utf8")) as {
    minimumTestSuites: string[];
  };

  for (const suitePath of strategy.minimumTestSuites) {
    const absolute = path.join(repoRoot, suitePath);
    const source = await readFile(absolute, "utf8");
    assert.ok(source.length > 0, `Declared suite is empty or unreadable: ${suitePath}`);
  }
});
