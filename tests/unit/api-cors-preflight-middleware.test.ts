import assert from "node:assert/strict";
import test from "node:test";
import { devCorsPreflightMiddleware } from "../../apps/api/src/common/middleware/dev-cors-preflight.middleware.js";

test("devCorsPreflightMiddleware responds 204 with ACAO for allowed Origin", () => {
  const previous = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = "http://127.0.0.1:8080,http://localhost:8080";

  try {
    let statusCode = 0;
    const headers: Record<string, string> = {};
    const req = {
      method: "OPTIONS",
      headers: { origin: "http://127.0.0.1:8080" },
    };
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end() {},
    };
    let nextCalled = false;

    devCorsPreflightMiddleware(req as never, res as never, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 204);
    assert.equal(headers["access-control-allow-origin"], "http://127.0.0.1:8080");
    assert.equal(headers["access-control-allow-credentials"], "true");
    assert.match(headers["access-control-allow-methods"] ?? "", /OPTIONS/);
  } finally {
    if (previous === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previous;
    }
  }
});

test("devCorsPreflightMiddleware passes non-OPTIONS to next", () => {
  let nextCalled = false;
  const req = { method: "GET", headers: {} };
  const res = {
    status() {
      return this;
    },
    setHeader() {},
    end() {},
  };

  devCorsPreflightMiddleware(req as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
