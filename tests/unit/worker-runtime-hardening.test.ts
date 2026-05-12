import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workerDevPath = path.join(repoRoot, "apps", "worker", "src", "dev.ts");
const queuesPath = path.join(repoRoot, "apps", "worker", "src", "jobs", "queues.ts");

test("worker bootstrap config includes retries and DLQ queues", async () => {
  const [workerDev, queues] = await Promise.all([
    readFile(workerDevPath, "utf8"),
    readFile(queuesPath, "utf8"),
  ]);

  assert.match(queues, /EXPORTS_DLQ/);
  assert.match(queues, /TASK_REMINDERS_DLQ/);
  assert.match(workerDev, /attempts:\s*5/);
  assert.match(workerDev, /attempts:\s*3/);
  assert.match(workerDev, /"worker\.job\.failed"/);
  assert.match(workerDev, /exportsDlq\.add/);
  assert.match(workerDev, /remindersDlq\.add/);
});
