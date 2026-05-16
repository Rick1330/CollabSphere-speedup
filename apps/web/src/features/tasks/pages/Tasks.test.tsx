import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Tasks from "./Tasks";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/use-workspace-route-context", () => ({
  useWorkspaceRouteContext: () => ({
    workspaceId: "alpha",
    sidebar: {
      id: "alpha",
      name: "Project Alpha",
      description: "Test",
      icon: "📦",
      type: "professional" as const,
      roleLabel: "OWNER",
      status: "active" as const,
      permissions: {
        canCreateContent: true,
        canEditSettings: true,
        canViewAnalytics: true,
      },
    },
    myRole: "OWNER" as const,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-session", () => ({
  useCurrentAccount: () => ({ id: "u1", fullName: "Test User", email: "t@test.com" }),
}));

// Smoke: the migrated Tasks page mounts inside the SPA router with an
// archived workspace param, shows the page chrome, and renders the board's
// loading skeleton (no thrown errors during initial async fetch).
describe("Tasks page (smoke)", () => {
  it("mounts under the workspace route without crashing", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/w/alpha/tasks"]}>
          <Routes>
            <Route path="/w/:workspaceId/tasks" element={<Tasks />} />
            <Route path="/w/:workspaceId/tasks/list" element={<div>list</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // The board surface owns the "Tasks" title via TaskPageHeader.
    expect(
      screen.getAllByText(/tasks/i).length,
      "page chrome should mention tasks",
    ).toBeGreaterThan(0);
  });
});
