import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/api/adapters/settings";
import { ApiError } from "@/api/client";
import { Loader2 } from "lucide-react";

const isAuthProfileError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.status === 401 || error.code === "TOKEN_INVALID" || error.code === "TOKEN_EXPIRED";
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return code === "TOKEN_INVALID" || code === "TOKEN_EXPIRED";
};

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Spec §3.2.4: ALL admin pages require globalRole === "ADMIN".
 * Distinguishes load failures (session / network) from forbidden (signed-in non-admin).
 */
export const AdminGuard = ({ children }: AdminGuardProps) => {
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  });

  if (isLoading) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking permissions...
        </div>
      </div>
    );
  }

  if (isError || !user) {
    const isAuth = isAuthProfileError(error);
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#FAFAF9]">
        <p className="text-stone-800 font-medium max-w-md">
          {isAuth ? "We couldn’t verify your session for the admin console." : "Couldn’t load your profile to check admin access."}
        </p>
        <p className="text-sm text-stone-600 max-w-md">
          {isAuth
            ? "Sign out and sign in again. If this keeps happening, your access token may not match the API (for example after changing JWT secrets)."
            : (error instanceof Error ? error.message : "Unknown error.")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login?next=%2Fadmin"
            className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 inline-flex items-center"
          >
            Go to sign in
          </Link>
          <Link to="/dashboard" className="text-sm text-teal-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (user.globalRole !== "ADMIN") {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#FAFAF9]">
        <p className="text-stone-800 font-medium">Admin access required</p>
        <p className="text-sm text-stone-600 max-w-md">
          This area is only available to platform administrators. Your account is signed in as a standard user.
        </p>
        <Link
          to="/dashboard"
          className="h-10 px-4 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 inline-flex items-center"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
