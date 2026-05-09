import { describe, it, expect, vi } from "vitest";
import * as apiClient from "@/api/client";
import {
  createTaskComment,
  deleteTaskComment,
  DEFAULT_BOARD_COLUMNS,
  buildBoardData,
  canTransition,
  getTaskDetail,
  listBoardTasks,
  listTaskComments,
  listTasksMap,
  listWorkspaceMembers,
  STATUS_LABELS,
  type TaskStatus,
  updateTaskComment,
} from "./tasks";

describe("api/adapters/tasks", () => {
  it("listTasksMap parses API list payload into task map", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({
        data: {
          resource: {
            view: "list",
            tasks: [
              {
                id: "task-1",
                title: "Task A",
                status: "todo",
                priority: "medium",
                labels: [],
                position: 1,
                reporterId: "user-1",
              },
            ],
          },
        },
      } as never);
    const map = await listTasksMap("alpha");
    expect(map["task-1"]?.title).toBe("Task A");
    requestSpy.mockRestore();
  });

  it("buildBoardData groups tasks under the configured columns and preserves order", async () => {
    const map = {
      "task-1": {
        id: "task-1",
        title: "Task A",
        status: "todo" as const,
        priority: "medium" as const,
        assignee: null,
        dueDate: null,
        labels: [],
        commentCount: 0,
        position: 1,
        description: null,
        descriptionRich: null,
        reporterId: "user-1",
        reporterName: "User One",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        linkedResources: [],
        comments: [],
        parentTaskId: null,
        subtaskIds: [],
        blockedByTaskIds: [],
        blockingTaskIds: [],
      },
    };
    const board = buildBoardData(map, DEFAULT_BOARD_COLUMNS);

    expect(board.map((c) => c.status)).toEqual([
      "todo",
      "in_progress",
      "in_review",
      "done",
    ]);

    for (const col of board) {
      for (const t of col.tasks) {
        expect(t.status).toBe(col.status);
      }
      // position ordering is monotonic per column
      const positions = col.tasks.map((t) => t.position);
      const sorted = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sorted);
    }
  });

  it("listBoardTasks returns the same shape as buildBoardData", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValue({
        data: {
          resource: {
            view: "list",
            tasks: [],
          },
        },
      } as never);
    const board = await listBoardTasks("alpha", DEFAULT_BOARD_COLUMNS);
    expect(Array.isArray(board)).toBe(true);
    expect(board.length).toBe(DEFAULT_BOARD_COLUMNS.length);
    for (const col of board) {
      expect(STATUS_LABELS[col.status as TaskStatus]).toBeDefined();
    }
    requestSpy.mockRestore();
  });

  it("listWorkspaceMembers returns at least one assignable member", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({
        data: {
          items: [{ user: { id: "user-1", fullName: "Alice", avatarUrl: null } }],
          total: 1,
        },
      } as never);
    const members = await listWorkspaceMembers("alpha");
    expect(members.length).toBe(1);
    expect(members[0]).toHaveProperty("id");
    expect(members[0]).toHaveProperty("fullName");
    requestSpy.mockRestore();
  });

  it("canTransition enforces the documented workflow", () => {
    const cases: [TaskStatus, TaskStatus, boolean][] = [
      ["todo", "in_progress", true],
      ["in_progress", "in_review", true],
      ["in_review", "done", true],
      ["done", "todo", false], // not allowed
      ["backlog", "in_progress", false],
      ["todo", "todo", true], // same column ok
    ];
    for (const [from, to, expected] of cases) {
      expect(canTransition(from, to)).toBe(expected);
    }
  });

  it("listTaskComments flattens threads and preserves reply parent links", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: {
        resource: {
          threads: [
            {
              id: "thread-1",
              status: "resolved",
              comments: [
                {
                  id: "c-1",
                  authorId: "user-1",
                  content: [{ type: "text", text: "root" }],
                  createdAt: "2026-05-09T10:00:00.000Z",
                },
                {
                  id: "c-2",
                  authorId: "user-2",
                  content: [{ type: "text", text: "reply" }],
                  createdAt: "2026-05-09T10:05:00.000Z",
                },
              ],
            },
          ],
        },
      },
    } as never);
    const comments = await listTaskComments("alpha", "task-1");
    expect(comments).toHaveLength(2);
    expect(comments[0]?.resolved).toBe(true);
    expect(comments[1]?.parentId).toBe("c-1");
    requestSpy.mockRestore();
  });

  it("getTaskDetail hydrates comments from comments API", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({
        data: {
          resource: {
            task: {
              id: "task-1",
              title: "Task A",
              status: "todo",
              priority: "medium",
              labels: [],
              position: 1,
              reporterId: "user-1",
            },
          },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          resource: {
            threads: [
              {
                id: "thread-1",
                status: "open",
                comments: [
                  {
                    id: "c-1",
                    authorId: "user-1",
                    content: [{ type: "text", text: "hello" }],
                    createdAt: "2026-05-09T10:00:00.000Z",
                  },
                ],
              },
            ],
          },
        },
      } as never);
    const detail = await getTaskDetail("alpha", "task-1");
    expect(detail?.comments.length).toBe(1);
    expect(detail?.commentCount).toBe(1);
    requestSpy.mockRestore();
  });

  it("comment mutation adapters call expected endpoints", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValue({} as never);
    await createTaskComment("alpha", "task-1", [{ type: "text", text: "hello" }]);
    await updateTaskComment("alpha", "c-1", [{ type: "text", text: "edited" }]);
    await deleteTaskComment("alpha", "c-1");
    expect(requestSpy).toHaveBeenCalledTimes(3);
    expect(requestSpy.mock.calls[0]?.[0]).toContain("/comments/threads");
    expect(requestSpy.mock.calls[1]?.[0]).toContain("/comments/c-1");
    expect(requestSpy.mock.calls[2]?.[0]).toContain("/comments/c-1/delete");
    requestSpy.mockRestore();
  });
});
