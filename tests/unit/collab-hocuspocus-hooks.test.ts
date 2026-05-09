import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { Doc } from "yjs";
import { createCollabHooks, type CollabPersistenceAdapter } from "../../apps/collab/src/hocuspocus-server";

const jwtSecret = "test-collab-secret";

const createAdapter = (): {
  adapter: CollabPersistenceAdapter;
  calls: {
    persist: Array<{
      documentId: string;
      updatedById: string;
      contentYjs: Uint8Array;
      contentPlaintext: string;
      updatedAt: Date;
    }>;
  };
} => {
  const calls = {
    persist: [] as Array<{
      documentId: string;
      updatedById: string;
      contentYjs: Uint8Array;
      contentPlaintext: string;
      updatedAt: Date;
    }>,
  };

  return {
    calls,
    adapter: {
      async findDocumentForAccess({ userId }) {
        if (userId === "missing-member") {
          return { role: "VIEWER", document: null };
        }

        return {
          role: userId === "viewer-user" ? "VIEWER" : "MEMBER",
          document: {
            id: "doc-1",
            workspaceId: "ws-1",
            status: userId === "submitted-user" ? "submitted" : "draft",
            isLocked: userId === "locked-user",
            deletedAt: null,
            contentYjs: new Uint8Array(0),
          },
        };
      },
      async findDocumentById() {
        return {
          contentYjs: new Uint8Array([1, 2, 3]),
        };
      },
      async persistDocument(input) {
        calls.persist.push(input);
      },
    },
  };
};

const createToken = (userId: string, claims?: Record<string, unknown>) =>
  jwt.sign({ sub: userId, ...(claims ?? {}) }, jwtSecret);

test("onAuthenticate enforces membership and sets readonly for viewer/locked/submitted states", async () => {
  const { adapter } = createAdapter();
  const hooks = createCollabHooks({ adapter, jwtSecret });

  await assert.rejects(
    hooks.onAuthenticate({
      token: createToken("missing-member"),
      documentName: "doc:doc-1",
      connectionConfig: { isAuthenticated: false, readOnly: false },
      context: {},
    } as any),
    /Document not found/,
  );

  const viewerConnectionConfig = { isAuthenticated: false, readOnly: false };
  const viewerContext: Record<string, unknown> = {};
  await hooks.onAuthenticate({
    token: createToken("viewer-user"),
    documentName: "doc:doc-1",
    connectionConfig: viewerConnectionConfig,
    context: viewerContext,
  } as any);
  assert.equal(viewerConnectionConfig.isAuthenticated, true);
  assert.equal(viewerConnectionConfig.readOnly, true);
  assert.equal(viewerContext.readOnly, true);

  const lockedConnectionConfig = { isAuthenticated: false, readOnly: false };
  await hooks.onAuthenticate({
    token: createToken("locked-user"),
    documentName: "doc:doc-1",
    connectionConfig: lockedConnectionConfig,
    context: {},
  } as any);
  assert.equal(lockedConnectionConfig.readOnly, true);

  const submittedConnectionConfig = { isAuthenticated: false, readOnly: false };
  await hooks.onAuthenticate({
    token: createToken("submitted-user"),
    documentName: "doc:doc-1",
    connectionConfig: submittedConnectionConfig,
    context: {},
  } as any);
  assert.equal(submittedConnectionConfig.readOnly, true);
});

test("onAuthenticate validates optional workspace/document claims", async () => {
  const { adapter } = createAdapter();
  const hooks = createCollabHooks({ adapter, jwtSecret });

  await assert.rejects(
    hooks.onAuthenticate({
      token: createToken("member-1", { workspaceId: "ws-other" }),
      documentName: "doc:doc-1",
      connectionConfig: { isAuthenticated: false, readOnly: false },
      context: {},
    } as any),
    /Workspace token claim does not match/,
  );

  await assert.rejects(
    hooks.onAuthenticate({
      token: createToken("member-1", { workspaceId: "ws-1", documentId: "doc-other" }),
      documentName: "doc:doc-1",
      connectionConfig: { isAuthenticated: false, readOnly: false },
      context: {},
    } as any),
    /Document token claim does not match/,
  );
});

test("onLoadDocument returns stored Yjs bytes", async () => {
  const { adapter } = createAdapter();
  const hooks = createCollabHooks({ adapter, jwtSecret });

  const loaded = await hooks.onLoadDocument({
    documentName: "doc:doc-1",
  } as any);

  assert.deepEqual(Array.from(loaded), [1, 2, 3]);
});

test("onStoreDocument persists yjs, plaintext, updated metadata", async () => {
  const { adapter, calls } = createAdapter();
  const hooks = createCollabHooks({ adapter, jwtSecret });
  const doc = new Doc();
  doc.getText("default").insert(0, "Hello collab");

  await hooks.onStoreDocument({
    document: doc as any,
    documentName: "doc:doc-1",
    lastContext: {
      userId: "author-1",
      workspaceId: "ws-1",
      documentId: "doc-1",
      readOnly: false,
    },
  } as any);

  assert.equal(calls.persist.length, 1);
  assert.equal(calls.persist[0].documentId, "doc-1");
  assert.equal(calls.persist[0].updatedById, "author-1");
  assert.equal(typeof calls.persist[0].contentPlaintext, "string");
  assert.ok(calls.persist[0].contentYjs.length > 0);
  assert.ok(calls.persist[0].updatedAt instanceof Date);
});
