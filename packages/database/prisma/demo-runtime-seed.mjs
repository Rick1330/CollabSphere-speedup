/**
 * Deterministic demo data for UI accounts (e.g. elshaday@collabsphere.app).
 * Run: pnpm demo:seed-runtime
 *
 * Password for demo user: Demo1234!  (bcrypt hash below)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

function loadRepoEnv() {
  try {
    const prismaDir = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(prismaDir, "..", "..", "..");
    const envPath = resolve(repoRoot, ".env");
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!key) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // ignore env parsing issues in seed scripts
  }
}

// Prefer repo-local `.env` over global shell overrides.
// This prevents accidental use of a developer's global `DATABASE_URL`.
loadRepoEnv();
process.env.DATABASE_URL =
  process.env.DATABASE_URL?.includes("://postgres:postgres@") || process.env.DATABASE_URL?.endsWith("/test")
    ? "postgresql://collab:collab@localhost:5432/collabsphere"
    : process.env.DATABASE_URL;

const prisma = new PrismaClient();

const IDS = {
  userDemo: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00001",
  userMember: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00011",
  wsAlpha: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00002",
  wsThesis: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00012",
  mAlphaOwner: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00003",
  mAlphaMember: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00013",
  mThesisOwner: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00014",
  fAlphaPlanning: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00004",
  fAlphaReports: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00015",
  fThesisDrafts: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00016",
  dRunbook: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00005",
  dRoadmap: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00017",
  dLitReview: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00018",
  tReviewWorkspace: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00006",
  tVerifyFeed: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00007",
  tSubmitDraft: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00019",
  threadDoc: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00008",
  commentDoc: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d00009",
  activityDocCreated: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d0000a",
  activityTaskMoved: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d0001a",
  notifTaskAssigned: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d0000b",
  notifDocMention: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d0001b",
  notifDeadline: "d0d0d0d0-d0d0-40d0-8d0d-d0d0d0d0001c",
};

const DEMO_EMAIL = "elshaday@collabsphere.app";
/** bcrypt.hashSync('Demo1234!', 10) */
const DEMO_HASH = "$2b$10$v8OCu24Rw9rk.gU2OeM4u.rqXfKVjdVlA6kDS98eOTReqcaP3EprK";

async function upsertUsers() {
  await prisma.user.upsert({
    where: { id: IDS.userDemo },
    create: {
      id: IDS.userDemo,
      email: DEMO_EMAIL,
      fullName: "Elshaday Tesfaye",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Elshaday",
      bio: "Product engineer running CollabSphere demo flows.",
      themePreference: "system",
      globalRole: "ADMIN",
      authProvider: "local",
      passwordHash: DEMO_HASH,
      isVerified: true,
      isActive: true,
    },
    update: {
      email: DEMO_EMAIL,
      fullName: "Elshaday Tesfaye",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Elshaday",
      bio: "Product engineer running CollabSphere demo flows.",
      themePreference: "system",
      globalRole: "ADMIN",
      passwordHash: DEMO_HASH,
      isVerified: true,
      isActive: true,
      deletedAt: null,
    },
  });

  await prisma.user.upsert({
    where: { id: IDS.userMember },
    create: {
      id: IDS.userMember,
      email: "kidist@collabsphere.app",
      fullName: "Kidist Alemu",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Kidist",
      bio: "Research collaborator account for demo workspaces.",
      themePreference: "light",
      globalRole: "USER",
      authProvider: "local",
      passwordHash: DEMO_HASH,
      isVerified: true,
      isActive: true,
    },
    update: {
      email: "kidist@collabsphere.app",
      fullName: "Kidist Alemu",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Kidist",
      bio: "Research collaborator account for demo workspaces.",
      themePreference: "light",
      globalRole: "USER",
      passwordHash: DEMO_HASH,
      isVerified: true,
      isActive: true,
      deletedAt: null,
    },
  });
}

async function upsertWorkspaces() {
  await prisma.workspace.upsert({
    where: { id: IDS.wsAlpha },
    create: {
      id: IDS.wsAlpha,
      name: "Project Alpha",
      description: "Demo workspace for product planning, tasks, and documents.",
      icon: "📦",
      type: "professional",
      status: "active",
      ownerId: IDS.userDemo,
    },
    update: {
      name: "Project Alpha",
      description: "Demo workspace for product planning, tasks, and documents.",
      icon: "📦",
      type: "professional",
      status: "active",
      ownerId: IDS.userDemo,
      deletedAt: null,
    },
  });

  await prisma.workspace.upsert({
    where: { id: IDS.wsThesis },
    create: {
      id: IDS.wsThesis,
      name: "Thesis Lab",
      description: "Academic workspace with supervisor-style review workflow.",
      icon: "🎓",
      type: "academic",
      status: "active",
      ownerId: IDS.userDemo,
    },
    update: {
      name: "Thesis Lab",
      description: "Academic workspace with supervisor-style review workflow.",
      icon: "🎓",
      type: "academic",
      status: "active",
      ownerId: IDS.userDemo,
      deletedAt: null,
    },
  });
}

async function upsertMembershipsAndSettings() {
  const joinedAt = new Date();
  const lastAccessedAt = new Date();

  for (const member of [
    { id: IDS.mAlphaOwner, workspaceId: IDS.wsAlpha, userId: IDS.userDemo, role: "OWNER" },
    { id: IDS.mAlphaMember, workspaceId: IDS.wsAlpha, userId: IDS.userMember, role: "MEMBER" },
    { id: IDS.mThesisOwner, workspaceId: IDS.wsThesis, userId: IDS.userDemo, role: "OWNER" },
  ]) {
    await prisma.workspaceMember.upsert({
      where: { id: member.id },
      create: { ...member, isActive: true, joinedAt, lastAccessedAt },
      update: {
        ...member,
        isActive: true,
        leftAt: null,
        lastAccessedAt,
        deletedAt: null,
      },
    });
  }

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: IDS.wsAlpha },
    create: {
      workspaceId: IDS.wsAlpha,
      settings: { taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"] },
    },
    update: {
      settings: { taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"] },
    },
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: IDS.wsThesis },
    create: {
      workspaceId: IDS.wsThesis,
      settings: {
        taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"],
        submissionWorkflow: true,
      },
    },
    update: {
      settings: {
        taskWorkflow: ["backlog", "todo", "in_progress", "in_review", "done"],
        submissionWorkflow: true,
      },
    },
  });
}

async function upsertContent() {
  const folders = [
    { id: IDS.fAlphaPlanning, workspaceId: IDS.wsAlpha, name: "Planning", position: 1, createdById: IDS.userDemo },
    { id: IDS.fAlphaReports, workspaceId: IDS.wsAlpha, name: "Reports", position: 2, createdById: IDS.userDemo },
    { id: IDS.fThesisDrafts, workspaceId: IDS.wsThesis, name: "Drafts", position: 1, createdById: IDS.userDemo },
  ];
  for (const folder of folders) {
    await prisma.folder.upsert({
      where: { id: folder.id },
      create: { ...folder, parentId: null },
      update: { ...folder, parentId: null, deletedAt: null },
    });
  }

  const docs = [
    {
      id: IDS.dRunbook,
      workspaceId: IDS.wsAlpha,
      folderId: IDS.fAlphaPlanning,
      title: "Demo runbook",
      position: 1,
      status: "draft",
      contentPlaintext: "Seeded demo document.",
      createdById: IDS.userDemo,
      updatedById: IDS.userDemo,
    },
    {
      id: IDS.dRoadmap,
      workspaceId: IDS.wsAlpha,
      folderId: IDS.fAlphaReports,
      title: "Q3 roadmap",
      position: 2,
      status: "approved",
      contentPlaintext: "Approved roadmap for the current quarter.",
      createdById: IDS.userDemo,
      updatedById: IDS.userDemo,
    },
    {
      id: IDS.dLitReview,
      workspaceId: IDS.wsThesis,
      folderId: IDS.fThesisDrafts,
      title: "Literature review draft",
      position: 1,
      status: "submitted",
      contentPlaintext: "Academic draft ready for supervisor review.",
      createdById: IDS.userDemo,
      updatedById: IDS.userDemo,
    },
  ];
  for (const doc of docs) {
    await prisma.document.upsert({
      where: { id: doc.id },
      create: doc,
      update: { ...doc, deletedAt: null },
    });
  }

  const tasks = [
    {
      id: IDS.tReviewWorkspace,
      workspaceId: IDS.wsAlpha,
      title: "Review demo workspace",
      description: "Walk through members, documents, and tasks.",
      status: "todo",
      priority: "high",
      assigneeId: IDS.userDemo,
      reporterId: IDS.userDemo,
      labels: ["demo"],
      position: 1,
    },
    {
      id: IDS.tVerifyFeed,
      workspaceId: IDS.wsAlpha,
      title: "Verify activity feed",
      description: "Open Activity and confirm seeded events appear.",
      status: "in_progress",
      priority: "medium",
      assigneeId: IDS.userDemo,
      reporterId: IDS.userDemo,
      labels: ["demo"],
      position: 2,
    },
    {
      id: IDS.tSubmitDraft,
      workspaceId: IDS.wsThesis,
      title: "Submit chapter draft",
      description: "Prepare chapter and move to in-review.",
      status: "in_review",
      priority: "urgent",
      assigneeId: IDS.userDemo,
      reporterId: IDS.userMember,
      labels: ["thesis"],
      position: 1,
    },
  ];
  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      create: task,
      update: { ...task, deletedAt: null },
    });
  }
}

async function upsertCommentAndEvents() {
  await prisma.commentThread.upsert({
    where: { id: IDS.threadDoc },
    create: {
      id: IDS.threadDoc,
      workspaceId: IDS.wsAlpha,
      targetType: "document",
      targetId: IDS.dRunbook,
      createdById: IDS.userDemo,
      status: "open",
    },
    update: {
      workspaceId: IDS.wsAlpha,
      targetType: "document",
      targetId: IDS.dRunbook,
      createdById: IDS.userDemo,
      status: "open",
      deletedAt: null,
    },
  });

  await prisma.comment.upsert({
    where: { id: IDS.commentDoc },
    create: {
      id: IDS.commentDoc,
      workspaceId: IDS.wsAlpha,
      threadId: IDS.threadDoc,
      authorId: IDS.userDemo,
      authorNameSnapshot: "Elshaday Tesfaye",
      content: [{ type: "text", text: "Demo comment on the runbook." }],
      contentPlaintext: "Demo comment on the runbook.",
    },
    update: {
      workspaceId: IDS.wsAlpha,
      threadId: IDS.threadDoc,
      authorId: IDS.userDemo,
      authorNameSnapshot: "Elshaday Tesfaye",
      content: [{ type: "text", text: "Demo comment on the runbook." }],
      contentPlaintext: "Demo comment on the runbook.",
      isDeleted: false,
      deletedAt: null,
    },
  });

  const events = [
    {
      id: IDS.activityDocCreated,
      workspaceId: IDS.wsAlpha,
      actorId: IDS.userDemo,
      actorNameSnapshot: "Elshaday Tesfaye",
      eventKey: "document.created",
      summary: "Created demo runbook",
      resourceType: "document",
      resourceId: IDS.dRunbook,
      resourceTitleSnapshot: "Demo runbook",
    },
    {
      id: IDS.activityTaskMoved,
      workspaceId: IDS.wsAlpha,
      actorId: IDS.userMember,
      actorNameSnapshot: "Kidist Alemu",
      eventKey: "task.status_changed",
      summary: "Moved Verify activity feed to In Progress",
      resourceType: "task",
      resourceId: IDS.tVerifyFeed,
      resourceTitleSnapshot: "Verify activity feed",
    },
  ];
  for (const event of events) {
    await prisma.activityEvent.upsert({
      where: { id: event.id },
      create: event,
      update: event,
    });
  }
}

async function upsertNotificationsAndPrefs() {
  const notifications = [
    {
      id: IDS.notifTaskAssigned,
      recipientId: IDS.userDemo,
      workspaceId: IDS.wsAlpha,
      actorId: IDS.userMember,
      type: "task.assigned",
      title: "Task assigned in Project Alpha",
      body: "Kidist assigned you to Verify activity feed.",
      resourceType: "task",
      resourceId: IDS.tVerifyFeed,
      url: `/w/${IDS.wsAlpha}/tasks/${IDS.tVerifyFeed}`,
      isRead: false,
    },
    {
      id: IDS.notifDocMention,
      recipientId: IDS.userDemo,
      workspaceId: IDS.wsAlpha,
      actorId: IDS.userMember,
      type: "document.mention",
      title: "Mentioned in Demo runbook",
      body: "Kidist mentioned you in a comment.",
      resourceType: "document",
      resourceId: IDS.dRunbook,
      url: `/w/${IDS.wsAlpha}/documents/${IDS.dRunbook}`,
      isRead: false,
    },
    {
      id: IDS.notifDeadline,
      recipientId: IDS.userDemo,
      workspaceId: IDS.wsThesis,
      actorId: IDS.userDemo,
      type: "deadline.reminder",
      title: "Thesis draft deadline tomorrow",
      body: "Submit chapter draft before end of day.",
      resourceType: "task",
      resourceId: IDS.tSubmitDraft,
      url: `/w/${IDS.wsThesis}/tasks/${IDS.tSubmitDraft}`,
      isRead: true,
      readAt: new Date(),
    },
  ];
  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      create: n,
      update: { ...n, deletedAt: null },
    });
  }

  await prisma.notificationPreference.upsert({
    where: { userId: IDS.userDemo },
    create: {
      userId: IDS.userDemo,
      inApp: {
        "task.assigned": true,
        "task.status_changed": true,
        "document.mention": true,
        "deadline.reminder": true,
      },
      email: {
        "task.assigned": false,
        "document.mention": false,
        "deadline.reminder": true,
      },
      dailyDigestEnabled: true,
      weeklyDigestEnabled: false,
    },
    update: {
      inApp: {
        "task.assigned": true,
        "task.status_changed": true,
        "document.mention": true,
        "deadline.reminder": true,
      },
      email: {
        "task.assigned": false,
        "document.mention": false,
        "deadline.reminder": true,
      },
      dailyDigestEnabled: true,
      weeklyDigestEnabled: false,
    },
  });
}

async function main() {
  await upsertUsers();
  await upsertWorkspaces();
  await upsertMembershipsAndSettings();
  await upsertContent();
  await upsertCommentAndEvents();
  await upsertNotificationsAndPrefs();

  console.log("Demo runtime data seeded.");
  console.log(`  Login: ${DEMO_EMAIL} / Demo1234!`);
  console.log(`  workspaceIds: ${IDS.wsAlpha}, ${IDS.wsThesis}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
