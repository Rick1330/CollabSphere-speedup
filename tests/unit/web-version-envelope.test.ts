import assert from "node:assert/strict";
import test from "node:test";
import {
  parseApiListEnvelope,
  parseApiSingleEnvelope,
} from "../../apps/web/src/api/client/envelope.ts";
import {
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../../apps/api/src/common/interceptors/response-envelope.interceptor.js";

test("parseApiListEnvelope reads Nest list versions payload", () => {
  const payload = wrapSuccessResponse({
    payload: createListResponsePayload({
      items: [
        {
          id: "ver-1",
          documentId: "doc-1",
          versionNumber: 1,
          reason: "auto",
          createdAt: "2026-05-08T00:00:00.000Z",
        },
      ],
      total: 1,
    }),
    requestId: "req_versions",
  });

  const { items, total } = parseApiListEnvelope(payload);
  assert.equal(total, 1);
  assert.equal(items[0]?.id, "ver-1");
});

test("parseApiSingleEnvelope reads Nest version detail resource", () => {
  const payload = wrapSuccessResponse({
    payload: createSingleResourcePayload({
      version: {
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        reason: "auto",
        yjsState: "AQID",
        plaintext: "Hello",
      },
    }),
    requestId: "req_version_detail",
  });

  const resource = parseApiSingleEnvelope<{ version: { id: string } }>(payload);
  assert.equal(resource.version.id, "ver-1");
});
