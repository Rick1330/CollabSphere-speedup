import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { GlobalShortcuts } from "@/app/shell/global-shortcuts";
import { authSession } from "@/lib/auth-session";

// Capture sonner toast calls without rendering a toaster surface.
const toastInfo = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    info: (...args: unknown[]) => toastInfo(...args),
    success: () => undefined,
    error: () => undefined,
  },
}));

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
};

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <GlobalShortcuts />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

const fireSequence = (keys: string[]) => {
  for (const key of keys) {
    fireEvent.keyDown(window, { key, bubbles: true, cancelable: true });
  }
};

describe("GlobalShortcuts — `g c` create document", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    toastInfo.mockReset();
    authSession.signOut();
  });

  afterEach(() => {
    authSession.signOut();
  });

  it("derives workspaceId from the URL and navigates to the new-document route", async () => {
    authSession.signIn("u_jane", {
      user: {
        id: "u_jane",
        email: "jane@test.com",
        fullName: "Jane Doe",
        globalRole: "ADMIN",
        defaultWorkspaceRole: "OWNER",
        defaultWorkspaceType: "professional",
      },
    });
    const { getByTestId } = renderAt("/w/alpha/dashboard");

    await act(async () => {
      fireSequence(["g", "c"]);
    });

    expect(getByTestId("location").textContent).toBe("/w/alpha/documents/new");
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("redirects to /workspaces with a toast when no workspace is in the URL", async () => {
    authSession.signIn("u_jane", {
      user: {
        id: "u_jane",
        email: "jane@test.com",
        fullName: "Jane Doe",
        globalRole: "ADMIN",
        defaultWorkspaceRole: "OWNER",
        defaultWorkspaceType: "professional",
      },
    });
    const { getByTestId } = renderAt("/dashboard");

    await act(async () => {
      fireSequence(["g", "c"]);
    });

    expect(getByTestId("location").textContent).toBe("/workspaces");
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledWith(
      "Pick a workspace first",
      expect.objectContaining({
        description: expect.stringMatching(/workspace/i),
      }),
    );
  });

  it("blocks creation for read-only roles (viewer/stakeholder)", async () => {
    authSession.signIn("u_viewer", {
      user: {
        id: "u_viewer",
        email: "viewer@test.com",
        fullName: "Viewer User",
        globalRole: "USER",
        defaultWorkspaceRole: "VIEWER",
        defaultWorkspaceType: "professional",
      },
    });

    const { getByTestId } = renderAt("/w/alpha/dashboard");

    await act(async () => {
      fireSequence(["g", "c"]);
    });

    expect(getByTestId("location").textContent).toBe("/w/alpha/dashboard");
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledWith(
      "Read-only access",
      expect.objectContaining({
        description: expect.stringMatching(/cannot create|browse/i),
      }),
    );
  });

  it("is a silent no-op when no user is signed in", async () => {
    const { getByTestId } = renderAt("/w/alpha/dashboard");

    await act(async () => {
      fireSequence(["g", "c"]);
    });

    expect(getByTestId("location").textContent).toBe("/w/alpha/dashboard");
    expect(toastInfo).not.toHaveBeenCalled();
  });
});
