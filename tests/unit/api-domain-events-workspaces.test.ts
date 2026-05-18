import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorkspacesService } from "../../apps/api/src/workspaces/workspaces.service.js";

test("updateMemberRole emits workspace.member_role_changed synchronously and publishes Redis payload", async () => {
  const ee = new EventEmitter2();
  const received: unknown[] = [];
  ee.on("workspace.member_role_changed", (payload: unknown) => {
    received.push(payload);
  });

  let publishChannel: string | null = null;
  let publishMessage: string | null = null;
  const redisPublish = {
    async publish(channel: string, message: string) {
      publishChannel = channel;
      publishMessage = message;
    },
  };

  const prisma = {
    workspaceMember: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id === "mem-target") {
          return { id: "mem-target", role: "MEMBER", userId: "user-b" };
        }
        if (where.userId === "actor-1" && where.workspaceId === "ws-1") {
          return { id: "mem-actor", role: "OWNER", workspaceId: "ws-1" };
        }
        return null;
      },
      update: async () => ({ id: "mem-target", role: "ADMIN" }),
    },
  };

  const svc = new WorkspacesService(prisma as never, ee, redisPublish as never);

  await svc.updateMemberRole({
    actorUserId: "actor-1",
    workspaceId: "ws-1",
    membershipId: "mem-target",
    role: "ADMIN",
  });

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    workspaceId: "ws-1",
    userId: "user-b",
    newRole: "ADMIN",
    oldRole: "MEMBER",
  });
  assert.equal(publishChannel, "collab:permission-changed");
  assert.deepEqual(JSON.parse(publishMessage ?? "{}"), {
    userId: "user-b",
    workspaceId: "ws-1",
    newRole: "ADMIN",
  });
});
