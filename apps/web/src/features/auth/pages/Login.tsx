import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { postLoginPath } from "@/features/auth/post-login-path";
import { AuthErrorBanner } from "@/features/auth/components/auth-error-banner";
import { parseOAuthFragment } from "@/features/auth/oauth-fragment";
import { authSession, clearOAuthHashFromUrl } from "@/lib/auth-session";
import { resetAuthQueryCache, teardownAuthSession } from "@/lib/auth-teardown";
import { getCurrentUser } from "@/api/adapters/auth";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";
import { ApiError } from "@/api/client";
import {
  checkDevApiReachable,
  DEV_API_DOWN_MESSAGE,
  messageForOAuthQueryError,
} from "@/lib/dev-auth-troubleshooting";

const Login = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryOAuthError = messageForOAuthQueryError(params.get("error"));
    if (queryOAuthError) {
      setOauthError(queryOAuthError);
      params.delete("error");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    let cancelled = false;
    const probe = () => {
      void checkDevApiReachable().then((ok) => {
        if (!cancelled) {
          setApiDown(!ok);
        }
      });
    };
    probe();
    const timer = window.setInterval(probe, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const raw = window.location.hash;
    const parsed = parseOAuthFragment(raw);
    if (!parsed) {
      if (raw.startsWith("#oauth=")) {
        clearOAuthHashFromUrl();
        setOauthError("Sign-in link invalid or expired — try Google again.");
      }
      return;
    }

    clearOAuthHashFromUrl();
    authSession.setOAuthBootstrapping(true);
    let cancelled = false;

    void (async () => {
      try {
        const { accessToken, csrfToken, user } = parsed;
        if (!accessToken || !user?.id) {
          setOauthError("Sign-in link invalid or expired — try Google again.");
          return;
        }

        await teardownAuthSession(queryClient, { callApiLogout: false });
        authSession.setOAuthBootstrapping(true);

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
          await getCurrentUser();
        } catch (verifyErr) {
          authSession.signOut();
          const apiDown =
            verifyErr instanceof ApiError &&
            verifyErr.status === 404 &&
            verifyErr.body &&
            typeof verifyErr.body === "object" &&
            "code" in verifyErr.body &&
            (verifyErr.body as { code?: string }).code === "NOT_FOUND";
          setOauthError(
            apiDown
              ? "API is not reachable on port 3001 (wrong service may be bound). Stop pnpm dev, free port 3001, set COLLAB_PORT=3002, and restart."
              : "Sign-in link invalid or expired — try Google again.",
          );
          return;
        }

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

        await resetAuthQueryCache(queryClient);

        const dest = await postLoginPath();
        if (!cancelled) navigate(dest, { replace: true });
      } catch {
        if (!cancelled) {
          setOauthError("Sign-in link invalid or expired — try Google again.");
        }
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
      {apiDown ? (
        <div className="mb-4">
          <AuthErrorBanner variant="error" message={DEV_API_DOWN_MESSAGE} />
        </div>
      ) : null}
      {oauthError ? (
        <div className="mb-4">
          <AuthErrorBanner variant="error" message={oauthError} />
        </div>
      ) : null}
      <LoginForm apiDown={apiDown} />
    </AuthLayout>
  );
};

export default Login;


