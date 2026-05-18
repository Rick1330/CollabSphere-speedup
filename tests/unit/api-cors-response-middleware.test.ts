import assert from "node:assert/strict";
import test from "node:test";
import { corsResponseMiddleware } from "../../apps/api/src/common/middleware/cors-response.middleware.js";

test("corsResponseMiddleware sets ACAO on non-OPTIONS responses for allowed Origin", () => {
  const previous = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = "http://127.0.0.1:8080";

  try {
    const headers: Record<string, string> = {};
    const req = { method: "GET", headers: { origin: "http://127.0.0.1:8080" } };
    let nextCalled = false;
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
    };

    corsResponseMiddleware(req as never, res as never, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(headers["access-control-allow-origin"], "http://127.0.0.1:8080");
    assert.equal(headers["access-control-allow-credentials"], "true");
  } finally {
    if (previous === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previous;
    }
  }
});
