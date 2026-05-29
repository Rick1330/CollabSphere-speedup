import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateNextDocumentVersionNumber,
  isPrismaUniqueConstraintError,
  runWithDocumentVersionRetry,
} from "../../packages/shared/src/document-version-allocation.js";

test("isPrismaUniqueConstraintError detects P2002", () => {
  assert.equal(isPrismaUniqueConstraintError({ code: "P2002" }), true);
  assert.equal(isPrismaUniqueConstraintError({ code: "P2025" }), false);
  assert.equal(isPrismaUniqueConstraintError(new Error("fail")), false);
});

test("allocateNextDocumentVersionNumber locks and returns max+1", async () => {
  const calls: string[] = [];
  const tx = {
    $executeRaw: async () => {
      calls.push("lock");
    },
    documentVersion: {
      findFirst: async () => {
        calls.push("find");
        return { versionNumber: 4 };
      },
    },
  };

  const next = await allocateNextDocumentVersionNumber(tx as never, "doc-uuid");
  assert.equal(next, 5);
  assert.deepEqual(calls, ["lock", "find"]);
});

test("allocateNextDocumentVersionNumber starts at 1 when no versions exist", async () => {
  const tx = {
    $executeRaw: async () => {},
    documentVersion: {
      findFirst: async () => null,
    },
  };

  const next = await allocateNextDocumentVersionNumber(tx as never, "doc-uuid");
  assert.equal(next, 1);
});

test("runWithDocumentVersionRetry retries on unique violation", async () => {
  let attempts = 0;
  const result = await runWithDocumentVersionRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw { code: "P2002" };
    }
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("runWithDocumentVersionRetry rethrows non-unique errors", async () => {
  await assert.rejects(
    () =>
      runWithDocumentVersionRetry(async () => {
        throw new Error("db down");
      }),
    /db down/,
  );
});
