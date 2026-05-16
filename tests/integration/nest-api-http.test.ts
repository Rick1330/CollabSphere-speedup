import "reflect-metadata";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import { HttpSuccessStatusInterceptor } from "../../apps/api/src/common/nest/http-success-status.interceptor.js";
import { NestAppErrorFilter } from "../../apps/api/src/common/nest/nest-app-error.filter.js";
import { WorkspaceMembershipGuard } from "../../apps/api/src/common/guards/workspace-membership.guard.js";
import { resolveRequestId } from "../../apps/api/src/common/middleware/request-id.middleware.js";
import { PrismaClientProvider } from "../../apps/api/src/common/prisma/prisma-client.provider.js";
import { HealthNestController } from "../../apps/api/src/health/health.nest.controller.js";
import { HealthService } from "../../apps/api/src/health/health.service.js";
import { DocumentsNestController } from "../../apps/api/src/documents/documents.nest.controller.js";
import { DocumentsService } from "../../apps/api/src/documents/documents.service.js";
import { FoldersNestController } from "../../apps/api/src/folders/folders.nest.controller.js";
import { FoldersService } from "../../apps/api/src/folders/folders.service.js";
import { WorkspacesNestController } from "../../apps/api/src/workspaces/workspaces.nest.controller.js";
import { WorkspacesService } from "../../apps/api/src/workspaces/workspaces.service.js";

const fixtureUserId = "00000000-0000-4000-8000-0000000000aa";
const fixtureWorkspaceId = "00000000-0000-4000-8000-000000000001";

const applyRequestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const id = resolveRequestId(req.get("x-request-id"));
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};

/** Test-only stand-in for JwtAuthGuard + legacy x-user-id header */
const applyFixtureActorMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers["x-user-id"];
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw === "string" && raw.trim()) {
    req.user = { sub: raw.trim(), email: "", globalRole: "USER" };
  }
  next();
};

const healthyResult = {
  status: "healthy" as const,
  checks: {
    database: { status: "healthy" as const, latencyMs: 0 },
    redis: { status: "healthy" as const, latencyMs: 0 },
  },
};

describe("Nest HTTP contract (filters, middleware, envelopes)", () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let memberRole: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER" = "OWNER";

  before(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [
        HealthNestController,
        WorkspacesNestController,
        DocumentsNestController,
        FoldersNestController,
      ],
      providers: [
        Reflector,
        WorkspaceMembershipGuard,
        {
          provide: PrismaClientProvider,
          useValue: {
            workspaceMember: {
              findFirst: async () => ({
                id: "00000000-0000-4000-8000-000000000099",
                role: memberRole,
                workspaceId: fixtureWorkspaceId,
                workspace: { id: fixtureWorkspaceId, status: "active" as const },
              }),
            },
          },
        },
        {
          provide: HealthService,
          useValue: { runChecks: async () => healthyResult },
        },
        {
          provide: WorkspacesService,
          useValue: {
            listForUser: async () => [
              {
                membershipId: "00000000-0000-4000-8000-000000000099",
                role: "OWNER",
                workspace: {
                  id: fixtureWorkspaceId,
                  name: "Fixture Workspace",
                  type: "general",
                  description: null,
                  icon: null,
                  archivedAt: null,
                  createdAt: new Date("2025-01-01T00:00:00.000Z"),
                  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
                },
              },
            ],
            createWorkspace: async ({ name, type }) => ({
              id: "00000000-0000-4000-8000-0000000000bb",
              name,
              description: null,
              icon: null,
              type,
              status: "active",
              createdAt: new Date("2025-01-01T00:00:00.000Z"),
              updatedAt: new Date("2025-01-01T00:00:00.000Z"),
            }),
          },
        },
        {
          provide: DocumentsService,
          useValue: {
            createDocument: async ({ title }) => ({
              id: "00000000-0000-4000-8000-0000000000cc",
              workspaceId: fixtureWorkspaceId,
              title,
              status: "draft",
            }),
          },
        },
        {
          provide: FoldersService,
          useValue: {
            createFolder: async ({ name }) => ({
              id: "00000000-0000-4000-8000-0000000000dd",
              name,
              parentId: null,
            }),
            deleteFolder: async () => ({ message: "Folder deleted." }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(applyRequestIdMiddleware);
    app.use(applyFixtureActorMiddleware);
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new NestAppErrorFilter());
    app.useGlobalInterceptors(new HttpSuccessStatusInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: false,
      }),
    );
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it("GET /api/v1/health echoes x-request-id and includes meta.requestId", async () => {
    const customId = "client-req-id-abc12";
    const res = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("x-request-id", customId)
      .expect(200);

    assert.equal(res.headers["x-request-id"], customId);
    assert.equal(res.body?.meta?.requestId, customId);
    assert.equal(res.body?.data?.resource?.status, "healthy");
  });

  it("POST /api/v1/workspaces creates workspace (no workspaceId guard skip)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("x-user-id", fixtureUserId)
      .send({
        name: "New Workspace",
        description: "Integration fixture workspace",
        type: "general",
      })
      .expect(201);

    assert.equal(res.body?.data?.resource?.workspace?.name, "New Workspace");
    assert.ok(typeof res.body?.meta?.requestId === "string");
  });

  it("POST /api/v1/workspaces/:id/folders allows MEMBER", async () => {
    memberRole = "MEMBER";
    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${fixtureWorkspaceId}/folders`)
      .set("x-user-id", fixtureUserId)
      .send({ name: "Member folder" })
      .expect(201);
    assert.equal(res.body?.data?.resource?.folder?.name, "Member folder");
    memberRole = "OWNER";
  });

  it("POST /api/v1/workspaces/:id/folders rejects VIEWER with 403", async () => {
    memberRole = "VIEWER";
    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${fixtureWorkspaceId}/folders`)
      .set("x-user-id", fixtureUserId)
      .send({ name: "Blocked folder" })
      .expect(403);
    assert.equal(res.body?.error?.code, "INSUFFICIENT_ROLE");
    memberRole = "OWNER";
  });

  it("DELETE /api/v1/workspaces/:id/folders/:folderId allows MANAGER", async () => {
    memberRole = "MANAGER" as typeof memberRole;
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${fixtureWorkspaceId}/folders/00000000-0000-4000-8000-0000000000dd`)
      .set("x-user-id", fixtureUserId)
      .expect(200);
    const message =
      res.body?.data?.action?.message ??
      res.body?.data?.resource?.message ??
      res.body?.data?.message;
    assert.equal(message, "Folder deleted.");
    memberRole = "OWNER";
  });

  it("POST /api/v1/workspaces/:id/documents creates document", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${fixtureWorkspaceId}/documents`)
      .set("x-user-id", fixtureUserId)
      .send({ title: "Fixture Doc" })
      .expect(201);

    assert.equal(res.body?.data?.resource?.document?.title, "Fixture Doc");
    assert.ok(typeof res.body?.meta?.requestId === "string");
  });

  it("GET /api/v1/workspaces returns list envelope with request id", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/workspaces")
      .set("x-user-id", fixtureUserId)
      .expect(200);

    assert.ok(typeof res.headers["x-request-id"] === "string");
    assert.ok(res.headers["x-request-id"].length > 0);
    assert.equal(res.body?.meta?.requestId, res.headers["x-request-id"]);
    assert.equal(res.body?.data?.total, 1);
    assert.equal(res.body?.data?.items?.[0]?.workspace?.name, "Fixture Workspace");
  });

  it("unknown route returns canonical error envelope with request id", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/no-such-endpoint").expect(404);

    assert.ok(res.body?.error?.code);
    assert.equal(res.body?.error?.requestId, res.headers["x-request-id"]);
  });
});
