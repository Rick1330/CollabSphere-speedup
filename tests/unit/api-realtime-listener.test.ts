import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RealtimeListener } from "../../apps/api/src/realtime/realtime.listener.js";

test("RealtimeListener bridges workspace.member_role_changed to workspace:role_changed synchronously", () => {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  const gateway = {
    emitToRoom(room: string, event: string, payload: unknown) {
      emitted.push({ room, event, payload });
    },
    emitToUser() {
      /* not used */
    },
  };

  const listener = new RealtimeListener(gateway as never);
  const ee = new EventEmitter2();
  ee.on("workspace.member_role_changed", (payload: unknown) => {
    listener.onWorkspaceMemberRoleChanged(payload as never);
  });

  ee.emit("workspace.member_role_changed", {
    workspaceId: "ws-1",
    userId: "user-b",
    newRole: "ADMIN",
    oldRole: "MEMBER",
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0]?.room, "workspace:ws-1");
  assert.equal(emitted[0]?.event, "workspace:role_changed");
  assert.deepEqual(emitted[0]?.payload, {
    workspaceId: "ws-1",
    userId: "user-b",
    newRole: "ADMIN",
    oldRole: "MEMBER",
  });
});
