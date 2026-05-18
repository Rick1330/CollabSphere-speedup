import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("@/api/client", () => ({
  request: requestMock,
}));

describe("comments adapter author mapping", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("maps author snapshots from API thread payload", async () => {
    requestMock.mockResolvedValue({
      data: {
        resource: {
          threads: [
            {
              id: "thread-1",
              status: "open",
              targetType: "document",
              targetId: "doc-1",
              createdById: "user-1",
              comments: [
                {
                  id: "c-1",
                  authorId: "user-1",
                  authorNameSnapshot: "Elshaday Tesfaye",
                  authorAvatarSnapshot: null,
                  content: [{ type: "text", text: "Hello" }],
                  createdAt: "2026-05-15T12:00:00.000Z",
                },
                {
                  id: "c-2",
                  authorId: "user-2",
                  authorNameSnapshot: "Eyob Bekele",
                  authorAvatarSnapshot: "https://cdn.example/a.png",
                  content: [{ type: "text", text: "Reply" }],
                  createdAt: "2026-05-15T12:01:00.000Z",
                },
              ],
            },
          ],
        },
      },
    });

    const { listDocumentThreads } = await import("./comments");
    const threads = await listDocumentThreads("ws-1", "doc-1");

    expect(threads).toHaveLength(1);
    expect(threads[0].author.fullName).toBe("Elshaday Tesfaye");
    expect(threads[0].replies[0].author.fullName).toBe("Eyob Bekele");
    expect(threads[0].replies[0].author.avatarUrl).toBe("https://cdn.example/a.png");
  });
});
