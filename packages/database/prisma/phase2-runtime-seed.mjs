import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IDS = {
  testerUser: "11111111-1111-4111-8111-111111111111",
  adminUser: "22222222-2222-4222-8222-222222222222",
  workspace: "33333333-3333-4333-8333-333333333333",
  memberTester: "44444444-4444-4444-8444-444444444444",
  memberAdmin: "55555555-5555-4555-8555-555555555555",
  settings: "33333333-3333-4333-8333-333333333333",
  folder: "66666666-6666-4666-8666-666666666666",
  document: "77777777-7777-4777-8777-777777777777",
  taskA: "88888888-8888-4888-8888-888888888888",
  taskB: "99999999-9999-4999-8999-999999999999",
  threadDoc: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  threadTask: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  commentDoc: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  commentTask: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  notification: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc1",
  activity: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd1",
};

const TESTER_EMAIL = "phase2.tester@collabsphere.local";
const TESTER_HASH = "$2b$10$rygHZyKsNsaAGJTO5u4cAOZndaKYTgMduM8WIXKowknqc0TlJ6Pl2";
const ADMIN_EMAIL = "phase2.admin@collabsphere.local";
const ADMIN_HASH = "$2b$10$XMNN3l.xy2yWESdIPIsWHOWHUsEO4jRdXQjZrfSA/SIBhch7izyjC";

async function main() {
  await prisma.user.upsert({
    where: { id: IDS.testerUser },
    create: {
      id: IDS.testerUser,
      email: TESTER_EMAIL,
      fullName: "Phase Two Tester",
      globalRole: "USER",
      authProvider: "local",
      passwordHash: TESTER_HASH,
      isVerified: true,
      isActive: true,
    },
    update: {
      email: TESTER_EMAIL,
      fullName: "Phase Two Tester",
      passwordHash: TESTER_HASH,
      isVerified: true,
      isActive: true,
      deletedAt: null,
    },
  });

  await prisma.user.upsert({
    where: { id: IDS.adminUser },
    create: {
      id: IDS.adminUser,
      email: ADMIN_EMAIL,
      fullName: "Phase Two Admin",
      globalRole: "ADMIN",
      authProvider: "local",
      passwordHash: ADMIN_HASH,
      isVerified: true,
      isActive: true,
    },
    update: {
      email: ADMIN_EMAIL,
      fullName: "Phase Two Admin",
      globalRole: "ADMIN",
      passwordHash: ADMIN_HASH,
      isVerified: true,
      isActive: true,
      deletedAt: null,
    },
  });

  await prisma.workspace.upsert({
    where: { id: IDS.workspace },
    create: {
      id: IDS.workspace,
      name: "Phase 2 Live Workspace",
      description: "Deterministic runtime workspace for Phase 2 verification.",
      type: "professional",
      status: "active",
      ownerId: IDS.adminUser,
    },
    update: {
      name: "Phase 2 Live Workspace",
      description: "Deterministic runtime workspace for Phase 2 verification.",
      status: "active",
      ownerId: IDS.adminUser,
      deletedAt: null,
    },
  });

  await prisma.workspaceMember.upsert({
    where: { id: IDS.memberAdmin },
    create: {
      id: IDS.memberAdmin,
      workspaceId: IDS.workspace,
      userId: IDS.adminUser,
      role: "OWNER",
      isActive: true,
      joinedAt: new Date(),
    },
    update: { workspaceId: IDS.workspace, userId: IDS.adminUser, role: "OWNER", isActive: true, leftAt: null, deletedAt: null },
  });

  await prisma.workspaceMember.upsert({
    where: { id: IDS.memberTester },
    create: {
      id: IDS.memberTester,
      workspaceId: IDS.workspace,
      userId: IDS.testerUser,
      role: "MANAGER",
      isActive: true,
      joinedAt: new Date(),
    },
    update: { workspaceId: IDS.workspace, userId: IDS.testerUser, role: "MANAGER", isActive: true, leftAt: null, deletedAt: null },
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: IDS.settings },
    create: { workspaceId: IDS.settings, settings: { taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"] } },
    update: { settings: { taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"] } },
  });

  await prisma.folder.upsert({
    where: { id: IDS.folder },
    create: { id: IDS.folder, workspaceId: IDS.workspace, name: "Planning", parentId: null, position: 1, createdById: IDS.adminUser },
    update: { workspaceId: IDS.workspace, name: "Planning", parentId: null, position: 1, createdById: IDS.adminUser, deletedAt: null },
  });

  await prisma.document.upsert({
    where: { id: IDS.document },
    create: {
      id: IDS.document,
      workspaceId: IDS.workspace,
      folderId: IDS.folder,
      title: "Phase 2 Runbook",
      position: 1,
      status: "draft",
      contentPlaintext: "Phase 2 seeded document body.",
      createdById: IDS.adminUser,
      updatedById: IDS.adminUser,
    },
    update: {
      workspaceId: IDS.workspace,
      folderId: IDS.folder,
      title: "Phase 2 Runbook",
      position: 1,
      status: "draft",
      contentPlaintext: "Phase 2 seeded document body.",
      updatedById: IDS.adminUser,
      deletedAt: null,
    },
  });

  await prisma.task.upsert({
    where: { id: IDS.taskA },
    create: {
      id: IDS.taskA,
      workspaceId: IDS.workspace,
      title: "Validate auth to tasks flow",
      description: "Ensure seeded user can read/write tasks after login.",
      status: "todo",
      priority: "high",
      assigneeId: IDS.testerUser,
      reporterId: IDS.adminUser,
      labels: ["phase2", "auth"],
      position: 1,
    },
    update: {
      workspaceId: IDS.workspace,
      title: "Validate auth to tasks flow",
      description: "Ensure seeded user can read/write tasks after login.",
      status: "todo",
      priority: "high",
      assigneeId: IDS.testerUser,
      reporterId: IDS.adminUser,
      labels: ["phase2", "auth"],
      position: 1,
      deletedAt: null,
    },
  });

  await prisma.task.upsert({
    where: { id: IDS.taskB },
    create: {
      id: IDS.taskB,
      workspaceId: IDS.workspace,
      title: "Verify notifications and activity",
      description: "Check realtime and feed parity.",
      status: "in_progress",
      priority: "medium",
      assigneeId: IDS.adminUser,
      reporterId: IDS.testerUser,
      labels: ["phase2", "activity"],
      position: 2,
    },
    update: {
      workspaceId: IDS.workspace,
      title: "Verify notifications and activity",
      description: "Check realtime and feed parity.",
      status: "in_progress",
      priority: "medium",
      assigneeId: IDS.adminUser,
      reporterId: IDS.testerUser,
      labels: ["phase2", "activity"],
      position: 2,
      deletedAt: null,
    },
  });

  await prisma.commentThread.upsert({
    where: { id: IDS.threadDoc },
    create: { id: IDS.threadDoc, workspaceId: IDS.workspace, targetType: "document", targetId: IDS.document, createdById: IDS.testerUser, status: "open" },
    update: { workspaceId: IDS.workspace, targetType: "document", targetId: IDS.document, createdById: IDS.testerUser, status: "open", deletedAt: null },
  });

  await prisma.comment.upsert({
    where: { id: IDS.commentDoc },
    create: {
      id: IDS.commentDoc,
      workspaceId: IDS.workspace,
      threadId: IDS.threadDoc,
      authorId: IDS.testerUser,
      authorNameSnapshot: "Phase Two Tester",
      content: [{ type: "text", text: "Seeded document comment." }],
      contentPlaintext: "Seeded document comment.",
    },
    update: {
      workspaceId: IDS.workspace,
      threadId: IDS.threadDoc,
      authorId: IDS.testerUser,
      authorNameSnapshot: "Phase Two Tester",
      content: [{ type: "text", text: "Seeded document comment." }],
      contentPlaintext: "Seeded document comment.",
      isDeleted: false,
      deletedAt: null,
    },
  });

  await prisma.commentThread.upsert({
    where: { id: IDS.threadTask },
    create: { id: IDS.threadTask, workspaceId: IDS.workspace, targetType: "task", targetId: IDS.taskA, createdById: IDS.adminUser, status: "open" },
    update: { workspaceId: IDS.workspace, targetType: "task", targetId: IDS.taskA, createdById: IDS.adminUser, status: "open", deletedAt: null },
  });

  await prisma.comment.upsert({
    where: { id: IDS.commentTask },
    create: {
      id: IDS.commentTask,
      workspaceId: IDS.workspace,
      threadId: IDS.threadTask,
      authorId: IDS.adminUser,
      authorNameSnapshot: "Phase Two Admin",
      content: [{ type: "text", text: "Seeded task comment." }],
      contentPlaintext: "Seeded task comment.",
    },
    update: {
      workspaceId: IDS.workspace,
      threadId: IDS.threadTask,
      authorId: IDS.adminUser,
      authorNameSnapshot: "Phase Two Admin",
      content: [{ type: "text", text: "Seeded task comment." }],
      contentPlaintext: "Seeded task comment.",
      isDeleted: false,
      deletedAt: null,
    },
  });

  await prisma.notification.upsert({
    where: { id: IDS.notification },
    create: {
      id: IDS.notification,
      recipientId: IDS.testerUser,
      workspaceId: IDS.workspace,
      actorId: IDS.adminUser,
      type: "task.assigned",
      title: "You were assigned to a Phase 2 task",
      body: "Open Tasks to review seeded assignment.",
      resourceType: "task",
      resourceId: IDS.taskA,
      url: `/w/${IDS.workspace}/tasks/${IDS.taskA}`,
      isRead: false,
    },
    update: {
      recipientId: IDS.testerUser,
      workspaceId: IDS.workspace,
      actorId: IDS.adminUser,
      type: "task.assigned",
      title: "You were assigned to a Phase 2 task",
      body: "Open Tasks to review seeded assignment.",
      resourceType: "task",
      resourceId: IDS.taskA,
      url: `/w/${IDS.workspace}/tasks/${IDS.taskA}`,
      isRead: false,
      readAt: null,
      deletedAt: null,
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: IDS.testerUser },
    create: {
      userId: IDS.testerUser,
      inApp: { "task.assigned": true, "comment.reply": true, "document.mention": true },
      email: { "task.assigned": true, "comment.reply": false, "document.mention": false },
      dailyDigestEnabled: false,
      weeklyDigestEnabled: true,
    },
    update: {
      inApp: { "task.assigned": true, "comment.reply": true, "document.mention": true },
      email: { "task.assigned": true, "comment.reply": false, "document.mention": false },
      dailyDigestEnabled: false,
      weeklyDigestEnabled: true,
    },
  });

  await prisma.activityEvent.upsert({
    where: { id: IDS.activity },
    create: {
      id: IDS.activity,
      workspaceId: IDS.workspace,
      actorId: IDS.adminUser,
      actorNameSnapshot: "Phase Two Admin",
      eventKey: "task.assigned",
      summary: "Phase Two Admin assigned a seeded task",
      resourceType: "task",
      resourceId: IDS.taskA,
      resourceTitleSnapshot: "Validate auth to tasks flow",
    },
    update: {
      workspaceId: IDS.workspace,
      actorId: IDS.adminUser,
      actorNameSnapshot: "Phase Two Admin",
      eventKey: "task.assigned",
      summary: "Phase Two Admin assigned a seeded task",
      resourceType: "task",
      resourceId: IDS.taskA,
      resourceTitleSnapshot: "Validate auth to tasks flow",
    },
  });

  console.log("phase2 deterministic runtime data seeded");
  console.log("tester: phase2.tester@collabsphere.local / Phase2!Test123");
  console.log("admin: phase2.admin@collabsphere.local / Phase2!Admin123");
  console.log(`workspaceId: ${IDS.workspace}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
