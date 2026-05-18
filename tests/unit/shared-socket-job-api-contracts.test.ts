import assert from "node:assert/strict";
import test from "node:test";

import {
  ClientEvents,
  ErrorCodes,
  JobTypes,
  Queues,
  ServerEvents,
  type ApiError,
  type ApiResponse,
  type DocumentTemplateV2,
  type EmailVerificationJobData,
  type JobPayloadByType,
  type WorkspaceTemplateV2,
} from "../../packages/shared/src/index.ts";

test("ErrorCodes includes required minimum auth and document codes", () => {
  assert.equal(ErrorCodes.VALIDATION_ERROR, "VALIDATION_ERROR");
  assert.equal(ErrorCodes.EMAIL_ALREADY_EXISTS, "EMAIL_ALREADY_EXISTS");
  assert.equal(ErrorCodes.INVALID_CREDENTIALS, "INVALID_CREDENTIALS");
  assert.equal(ErrorCodes.DOCUMENT_SUBMITTED, "DOCUMENT_SUBMITTED");
  assert.equal(ErrorCodes.INVALID_STATUS_TRANSITION, "INVALID_STATUS_TRANSITION");
  assert.equal(ErrorCodes.FOLDER_CYCLE_DETECTED, "FOLDER_CYCLE_DETECTED");
  assert.equal(ErrorCodes.INVALID_MENTION, "INVALID_MENTION");
  assert.ok(Object.keys(ErrorCodes).length >= 45);
});

test("ServerEvents and ClientEvents use production wire strings", () => {
  assert.equal(ServerEvents.NOTIFICATION_CREATED, "notification:created");
  assert.equal(ServerEvents.ACTIVITY_CREATED, "activity:created");
  assert.equal(ServerEvents.COMMENT_REPLY_CREATED, "comment:reply_created");
  assert.equal(ServerEvents.TASK_UPDATED, "task:updated");
  assert.equal(ClientEvents.JOIN_ROOM, "room:join:workspace");
  assert.equal(ClientEvents.MARK_NOTIFICATION_READ, "notification:read");
});

test("JobTypes and Queues define BullMQ contracts", () => {
  assert.equal(Queues.EMAIL, "email");
  assert.equal(Queues.SEARCH_INDEX, "search-index");
  assert.equal(JobTypes.EMAIL_VERIFICATION, "email.verification.send");
  assert.equal(JobTypes.VERSION_SNAPSHOT, "document.version.snapshot");

  const verification: JobPayloadByType[typeof JobTypes.EMAIL_VERIFICATION] = {
    userId: "u1",
    email: "a@b.c",
    verificationToken: "tok",
    fullName: "Test",
  };
  const _assignable: EmailVerificationJobData = verification;
  assert.equal(_assignable.userId, "u1");
});

test("ApiResponse and ApiError shapes accept typed payloads", () => {
  const ok: ApiResponse<{ id: string }> = {
    data: { id: "1" },
    meta: { requestId: "req_1" },
  };
  const err: ApiError = {
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: "Missing",
      requestId: "req_2",
      timestamp: new Date().toISOString(),
    },
  };
  assert.equal(ok.data.id, "1");
  assert.equal(err.error.code, "NOT_FOUND");
});

test("template V2 types support document and workspace kinds", () => {
  const doc: DocumentTemplateV2 = {
    id: "dt-1",
    kind: "document",
    category: "academic",
    subCategory: "rad",
    scope: "system",
    name: "RAD",
    description: "RAD template",
    version: 1,
    schemaVersion: 2,
    contentFormat: "richdocument",
    isEnabled: true,
    regions: [],
    variables: [],
  };
  const ws: WorkspaceTemplateV2 = {
    id: "wt-1",
    kind: "workspace",
    category: "academic",
    subCategory: "senior-project",
    scope: "system",
    name: "Senior Project",
    description: "Academic workspace",
    version: 1,
    schemaVersion: 2,
    isEnabled: true,
    defaults: {
      workspaceSettings: {
        submissionWorkflowEnabled: true,
        allowViewerCommentsOnDocs: false,
        allowViewerCommentsOnTasks: false,
      },
      roleLabels: {
        OWNER: "Owner",
        ADMIN: "Admin",
        MANAGER: "Manager",
        MEMBER: "Member",
        VIEWER: "Viewer",
      },
      taskLabels: [{ name: "Bug", color: "#f00", description: "Defect" }],
      onboardingDocKey: null,
    },
    structure: {
      folders: [],
      documents: [],
      taskBoard: { columns: [], defaultLabels: [] },
    },
  };
  assert.equal(doc.kind, "document");
  assert.equal(ws.kind, "workspace");
});
