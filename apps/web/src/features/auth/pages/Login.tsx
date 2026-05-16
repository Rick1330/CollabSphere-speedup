import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { postLoginPath } from "@/features/auth/components/login-form";
import { authSession } from "@/lib/auth-session";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";

const Login = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const raw = window.location.hash;
    if (!raw.startsWith("#oauth=")) return;

    authSession.setOAuthBootstrapping(true);
    let cancelled = false;

    void (async () => {
      try {
        const json = decodeURIComponent(raw.slice("#oauth=".length));
        const parsed = JSON.parse(json) as {
          accessToken?: string;
          csrfToken?: string;
          user?: {
            id: string;
            email: string;
            fullName: string;
            globalRole?: "USER" | "ADMIN";
            authProvider?: "local" | "google";
          };
        };
        const { accessToken, csrfToken, user } = parsed;
        if (!accessToken || !user?.id) return;

        authSession.signIn(user.id, {
          accessToken,
          csrfToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            globalRole: user.globalRole ?? "USER",
            authProvider: user.authProvider === "google" ? "google" : "local",
          },
        });

        try {
          const rows = await listMineWorkspaceRows();
          if (!cancelled) {
            const firstId = rows[0]?.workspace?.id;
            if (firstId) authSession.patchSession({ defaultWorkspaceId: firstId });
          }
        } catch {
          /* non-fatal */
        }

        if (cancelled) return;

        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        await queryClient.invalidateQueries({ queryKey: ["workspaces", "mine"] });
        await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });

        const dest = await postLoginPath();
        if (!cancelled) navigate(dest, { replace: true });
      } catch {
        /* ignore malformed fragment */
      } finally {
        if (!cancelled) authSession.setOAuthBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
      authSession.setOAuthBootstrapping(false);
    };
  }, [navigate, queryClient]);

  return (
    <AuthLayout
      footer={
        <>
          <span style={{ color: "var(--cs-text-faint)" }}>New to CollabSphere?</span>{" "}
          <Link
            to="/register"
            className="font-medium transition-colors duration-150"
            style={{ color: "rgba(45,212,191,0.8)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#2DD4BF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(45,212,191,0.8)";
            }}
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
