import assert from "node:assert/strict";
import test from "node:test";

import {
  DEV_API_PORT,
  DEV_COLLAB_PORT,
  DEV_WEB_PORT,
  validateDevPortContract,
} from "../../packages/shared/src/dev-port-contract.ts";

const validContract = {
  PORT: String(DEV_API_PORT),
  API_BASE_URL: `http://127.0.0.1:${DEV_API_PORT}`,
  WEB_APP_URL: `http://127.0.0.1:${DEV_WEB_PORT}`,
  BASE_URL: `http://127.0.0.1:${DEV_WEB_PORT}`,
  CORS_ORIGINS: `http://127.0.0.1:${DEV_WEB_PORT},http://localhost:${DEV_WEB_PORT},http://127.0.0.1:${DEV_API_PORT}`,
  COLLAB_WS_URL: `ws://127.0.0.1:${DEV_COLLAB_PORT}/collab`,
};

test("validateDevPortContract passes canonical local ports", () => {
  const issues = validateDevPortContract(validContract);
  assert.equal(issues.filter((i) => i.level === "error").length, 0);
});

test("validateDevPortContract errors when PORT disagrees with API_BASE_URL", () => {
  const issues = validateDevPortContract({
    ...validContract,
    PORT: "3002",
  });
  assert.ok(
    issues.some(
      (i) => i.level === "error" && i.message.includes("PORT=3002") && i.message.includes("3001"),
    ),
  );
});

test("validateDevPortContract errors when COLLAB_WS_URL uses API port", () => {
  const issues = validateDevPortContract({
    ...validContract,
    COLLAB_WS_URL: "ws://127.0.0.1:3001/collaboration",
  });
  assert.ok(issues.some((i) => i.level === "error" && i.message.includes("3001")));
});

test("validateDevPortContract errors when CORS omits web origin", () => {
  const issues = validateDevPortContract({
    ...validContract,
    CORS_ORIGINS: `http://127.0.0.1:${DEV_API_PORT}`,
  });
  assert.ok(issues.some((i) => i.level === "error" && i.message.includes("WEB_APP_URL")));
});

test("validateDevPortContract warns when localhost SPA origin missing from CORS", () => {
  const issues = validateDevPortContract({
    ...validContract,
    CORS_ORIGINS: `http://127.0.0.1:${DEV_WEB_PORT},http://127.0.0.1:${DEV_API_PORT}`,
  });
  assert.ok(
    issues.some(
      (i) => i.level === "warning" && i.message.includes("localhost:8080"),
    ),
  );
});

test("validateDevPortContract warns on unpaired loopback mix in CORS", () => {
  const issues = validateDevPortContract({
    ...validContract,
    CORS_ORIGINS: `http://localhost:${DEV_WEB_PORT},http://127.0.0.1:${DEV_API_PORT}`,
  });
  assert.ok(
    issues.some(
      (i) => i.level === "warning" &&
        (i.message.includes("127.0.0.1:8080") || i.message.includes("Mixing localhost")),
    ),
  );
});

test("validateDevPortContract warns on legacy port 3000 in CORS", () => {
  const issues = validateDevPortContract({
    ...validContract,
    CORS_ORIGINS: `${validContract.CORS_ORIGINS},http://127.0.0.1:3000`,
  });
  assert.ok(issues.some((i) => i.level === "warning" && i.message.includes("3000")));
});
