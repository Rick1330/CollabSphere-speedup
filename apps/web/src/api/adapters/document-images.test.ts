import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/client", () => ({
  fetchAuthenticated: vi.fn(),
  resolveConfiguredApiBaseUrl: () => "http://localhost:3001/api/v1",
}));

import { fetchAuthenticated } from "@/api/client";
import { uploadDocumentImage } from "./document-images";

describe("uploadDocumentImage", () => {
  beforeEach(() => {
    vi.mocked(fetchAuthenticated).mockReset();
  });

  it("posts multipart file and parses upload URL envelope", async () => {
    vi.mocked(fetchAuthenticated).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          url: "http://localhost:3001/uploads/doc-1/images/test.png",
          filename: "test.png",
        },
      }),
    } as Response);

    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const result = await uploadDocumentImage(file, {
      workspaceId: "ws-1",
      documentId: "doc-1",
    });

    expect(result.url).toContain("/uploads/doc-1/images/test.png");
    expect(fetchAuthenticated).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/workspaces/ws-1/documents/doc-1/images",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
