/**
 * Tasks API adapter.
 *
 * Canonical surface for everything task-related the UI needs:
 *  - async data reads (boards, lists, detail, members)
 *  - shared TYPES (TaskDetail, TaskStatus, …)
 *  - pure helpers that describe domain rules (canTransition, STATUS_LABELS,
 *    DEFAULT_BOARD_COLUMNS, buildBoardData)
 *
 * Components and pages MUST import from this module rather than from
 * `@/features/tasks/mocks/*`. The mock file is an implementation detail
 * that lives behind this adapter; once a real backend lands, only this
 * file changes.
 */
import { request } from "@/api/client";
import {
  buildBoardData,
  toBoardItem,
  type TaskBoardColumn,
  type TaskBoardColumnConfig,
  type TaskBoardItem,
  type TaskAssignee,
} from "@/features/tasks/mocks/tasks";
import type { TaskDetail } from "@/features/tasks/mocks/tasks";
import type { CommentNode } from "@/lib/mock-comments";

// Re-export domain types + pure helpers so the UI never needs to know the
// mock file exists.
export {
  STATUS_LABELS,
  VALID_TRANSITIONS,
  canTransition,
  transitionReason,
  DEFAULT_BOARD_COLUMNS,
  buildBoardData,
  toBoardItem,
  getAllLabels,
  getStatusLabel,
  getWorkspaceWorkflowColumns,
  setWorkspaceWorkflowColumns,
  type TaskPriority,
  type TaskStatus,
  type TaskComment,
  type TaskLinkedResource,
  type TaskDetail,
} from "@/features/tasks/mocks/tasks";

export type {
  TaskBoardColumn,
  TaskBoardColumnConfig,
  TaskAssignee,
};
export type { TaskBoardItem } from "@/features/tasks/mocks/tasks";

type SingleEnvelope<TResource> = {
  data?: {
    resource?: TResource;
  };
};

type ListEnvelope<TItem> = {
  data?: {
    items?: TItem[];
    total?: number;
  };
};

type ThreadStatus = "open" | "resolved";

type ApiTaskUser = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
};

type ApiTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string | null;
  assignee?: ApiTaskUser | null;
  reporterId?: string | null;
  reporter?: ApiTaskUser | null;
  dueDate?: string | Date | null;
  labels?: string[];
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  position?: number | string | null;
};

type ApiComment = {
  id: string;
  authorId?: string | null;
  authorNameSnapshot?: string | null;
  content?: CommentNode[];
  createdAt: string;
  updatedAt?: string;
};

type ApiCommentThread = {
  id: string;
  status: ThreadStatus;
  comments?: ApiComment[];
};

function toIsoOrNow(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function toTaskAssignee(user: ApiTaskUser | null | undefined): TaskAssignee | null {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ?? null,
  };
}

function toTaskDetail(task: ApiTask): TaskDetail {
  return {
    id: task.id,
    title: task.title,
    status: task.status as TaskDetail["status"],
    priority: task.priority as TaskDetail["priority"],
    assignee: toTaskAssignee(task.assignee),
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    labels: Array.isArray(task.labels) ? task.labels : [],
    commentCount: 0,
    position: Number(task.position ?? 0),
    description: task.description ?? null,
    descriptionRich: null,
    reporterId: task.reporterId ?? task.reporter?.id ?? "unknown",
    reporterName: task.reporter?.fullName ?? "Unknown",
    createdAt: toIsoOrNow(task.createdAt),
    updatedAt: toIsoOrNow(task.updatedAt),
    linkedResources: [],
    comments: [],
    parentTaskId: null,
    subtaskIds: [],
    blockedByTaskIds: [],
    blockingTaskIds: [],
  };
}

function parseSingleEnvelope<T>(payload: unknown): T {
  const resource = (payload as SingleEnvelope<T> | null | undefined)?.data?.resource;
  if (!resource) {
    throw new Error("Invalid API single-resource envelope.");
  }
  return resource;
}

function parseListEnvelope<T>(payload: unknown): T[] {
  const items = (payload as ListEnvelope<T> | null | undefined)?.data?.items;
  if (!Array.isArray(items)) {
    throw new Error("Invalid API list envelope.");
  }
  return items;
}

function toTaskComments(threads: ApiCommentThread[]): TaskDetail["comments"] {
  const mapped: TaskDetail["comments"] = [];
  for (const thread of threads) {
    const comments = [...(thread.comments ?? [])].sort((left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
    if (comments.length === 0) continue;
    const [root, ...replies] = comments;
    mapped.push({
      id: root.id,
      authorId: root.authorId ?? "unknown",
      body: Array.isArray(root.content) ? root.content : [{ type: "text", text: "" }],
      createdAt: toIsoOrNow(root.createdAt),
      updatedAt: root.updatedAt ? toIsoOrNow(root.updatedAt) : undefined,
      resolved: thread.status === "resolved",
      parentId: null,
    });
    for (const reply of replies) {
      mapped.push({
        id: reply.id,
        authorId: reply.authorId ?? "unknown",
        body: Array.isArray(reply.content) ? reply.content : [{ type: "text", text: "" }],
        createdAt: toIsoOrNow(reply.createdAt),
        updatedAt: reply.updatedAt ? toIsoOrNow(reply.updatedAt) : undefined,
        parentId: root.id,
      });
    }
  }
  return mapped;
}

export async function listTaskComments(workspaceId: string, taskId: string): Promise<TaskDetail["comments"]> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/comments?targetType=task&targetId=${encodeURIComponent(taskId)}`,
  );
  const resource = parseSingleEnvelope<{ threads?: ApiCommentThread[] }>(payload);
  return toTaskComments(resource.threads ?? []);
}

export async function createTaskComment(
  workspaceId: string,
  taskId: string,
  body: CommentNode[],
): Promise<void> {
  await request(
    `/workspaces/${workspaceId}/comments/threads?targetType=task&targetId=${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      body: { content: body },
    },
  );
}

export async function updateTaskComment(
  workspaceId: string,
  commentId: string,
  body: CommentNode[],
): Promise<void> {
  await request(`/workspaces/${workspaceId}/comments/${commentId}`, {
    method: "PATCH",
    body: { content: body },
  });
}

export async function deleteTaskComment(workspaceId: string, commentId: string): Promise<void> {
  await request(`/workspaces/${workspaceId}/comments/${commentId}/delete`, {
    method: "PATCH",
  });
}

export async function listBoardTasks(
  workspaceId: string,
  columns: TaskBoardColumnConfig[],
): Promise<TaskBoardColumn[]> {
  const map = await listTasksMap(workspaceId);
  return buildBoardData(map, columns);
}

export async function listAllTasks(workspaceId: string): Promise<TaskBoardItem[]> {
  const map = await listTasksMap(workspaceId);
  return Object.values(map).map(toBoardItem);
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  status?: TaskDetail["status"];
  priority?: TaskDetail["priority"];
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: string[];
};

export async function createTask(
  workspaceId: string,
  input: CreateTaskInput,
): Promise<TaskDetail> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/tasks`, {
    method: "POST",
    body: {
      title: input.title,
      description: input.description ?? undefined,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? undefined,
      dueDate: input.dueDate ?? undefined,
      labels: input.labels,
    },
  });
  const resource = parseSingleEnvelope<{ task?: ApiTask }>(payload);
  if (!resource.task) {
    throw new Error("Invalid API task create envelope.");
  }
  return toTaskDetail(resource.task);
}

export async function listTasksMap(
  workspaceId: string,
): Promise<Record<string, TaskDetail>> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/tasks?view=list`);
  const resource = parseSingleEnvelope<{ view: "list" | "board"; tasks: ApiTask[] }>(payload);
  const tasks = resource.tasks.map(toTaskDetail);
  return Object.fromEntries(tasks.map((task) => [task.id, task]));
}

export async function getTaskDetail(workspaceId: string, taskId: string): Promise<TaskDetail | null> {
  const [payload, comments] = await Promise.all([
    request<unknown>(`/workspaces/${workspaceId}/tasks/${taskId}`),
    listTaskComments(workspaceId, taskId),
  ]);
  const resource = parseSingleEnvelope<{ task?: ApiTask }>(payload);
  if (!resource.task) return null;
  const detail = toTaskDetail(resource.task);
  detail.comments = comments;
  detail.commentCount = comments.filter((comment) => !comment.parentId).length;
  return detail;
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<TaskAssignee[]> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/members`);
  const members = parseListEnvelope<{ user?: ApiTaskUser | null }>(payload);
  return members
    .map((member) => toTaskAssignee(member.user))
    .filter((member): member is TaskAssignee => Boolean(member));
}
