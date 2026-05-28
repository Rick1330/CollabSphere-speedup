import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { LEGACY_WORKSPACE_TEMPLATE_IDS } from "../../apps/api/src/templates/legacy-workspace-template-ids.js";
import { TemplatesService } from "../../apps/api/src/templates/templates.service.js";

function createTemplatesService(items: { id: string }[] = []) {
  let capturedWhere: unknown;
  const prisma = {
    template: {
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return items;
      },
      findFirst: async () => null,
    },
  };
  const service = new TemplatesService(prisma as never);
  return {
    service,
    getCapturedWhere: () => capturedWhere,
  };
}

test("listSystemTemplates excludes legacy workspace template ids in Prisma where", async () => {
  const { service, getCapturedWhere } = createTemplatesService();
  const result = await service.listSystemTemplates({ kind: "workspace", category: "academic" });

  const where = getCapturedWhere() as { id?: { notIn?: string[] } };
  assert.deepEqual(where.id?.notIn, [...LEGACY_WORKSPACE_TEMPLATE_IDS]);
  assert.equal(result.total, 0);
});

test("getById rejects legacy workspace template ids without querying the database", async () => {
  let findFirstCalls = 0;
  const prisma = {
    template: {
      findMany: async () => [],
      findFirst: async () => {
        findFirstCalls += 1;
        return null;
      },
    },
  };
  const service = new TemplatesService(prisma as never);

  await assert.rejects(
    () => service.getById("academic-thesis"),
    (error: unknown) => error instanceof AppError && error.code === "TEMPLATE_NOT_FOUND",
  );
  assert.equal(findFirstCalls, 0);
});
