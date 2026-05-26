/**
 * Central route table for the SPA.
 *
 * Public auth routes (login, register, forgot, reset, verify) bounce
 * authed users back to the app via `RedirectIfAuthed`. Every protected
 * surface is wrapped in `RequireAuth`. Admin pages additionally pass
 * through `AdminGuard`.
 *
 * Heavy pages are lazy-loaded so Vite dev does not fetch the entire app
 * module graph on every navigation (avoids ERR_INSUFFICIENT_RESOURCES).
 */
import { lazy, Suspense } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { RequireAuth, RedirectIfAuthed } from "./auth-guards";
import { GlobalShortcuts } from "@/app/shell/global-shortcuts";
import { ShortcutHelpDialog } from "@/app/shell/shortcut-help-dialog";
import { lazyPage } from "./lazy-route";
import { RouteLoadingFallback } from "./route-loading-fallback";

// Landing & auth (eager — small, first paint)
import Index from "@/features/landing/pages/Index";
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import VerifyEmail from "@/features/auth/pages/VerifyEmail";
import AcceptInvite from "@/features/auth/pages/AcceptInvite";

// Core shell (eager)
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Workspaces from "@/features/workspace/pages/Workspaces";
import NotFound from "@/pages/NotFound";

import { WorkspaceRealtimeLayout } from "@/app/routing/workspace-realtime-layout";

// Lazy — workspace, editor, tasks, settings, admin, etc.
const CreateWorkspace = lazyPage(() => import("@/features/workspace/pages/CreateWorkspace"));
const WorkspaceHome = lazyPage(() => import("@/features/workspace/pages/WorkspaceHome"));
const WorkspaceSettings = lazyPage(() => import("@/features/workspace/pages/WorkspaceSettings"));
const Documents = lazyPage(() => import("@/features/documents/pages/Documents"));
const NewDocument = lazyPage(() => import("@/features/documents/pages/NewDocument"));
const DocumentHistory = lazyPage(() => import("@/features/documents/pages/DocumentHistory"));
const Tasks = lazyPage(() => import("@/features/tasks/pages/Tasks"));
const TasksList = lazyPage(() => import("@/features/tasks/pages/TasksList"));
const TaskDetail = lazyPage(() => import("@/features/tasks/pages/TaskDetail"));
const Members = lazyPage(() => import("@/features/members/pages/Members"));
const WorkspaceMemberProfile = lazyPage(
  () => import("@/features/members/pages/WorkspaceMemberProfile"),
);
const Activity = lazyPage(() => import("@/features/activity/pages/Activity"));
const Notifications = lazyPage(() => import("@/features/notifications/pages/Notifications"));
const Settings = lazyPage(() => import("@/features/settings/pages/Settings"));
const SettingsProfile = lazyPage(() => import("@/features/settings/pages/SettingsProfile"));
const SettingsPassword = lazyPage(() => import("@/features/settings/pages/SettingsPassword"));
const SettingsNotifications = lazyPage(
  () => import("@/features/settings/pages/SettingsNotifications"),
);
const SettingsAppearance = lazyPage(() => import("@/features/settings/pages/SettingsAppearance"));
const Files = lazyPage(() => import("@/features/files/pages/Files"));
const Templates = lazyPage(() => import("@/features/templates/pages/Templates"));
const Analytics = lazyPage(() => import("@/features/analytics/pages/Analytics"));
const AdminDashboard = lazyPage(() => import("@/features/admin/pages/AdminDashboard"));
const AdminUsers = lazyPage(() => import("@/features/admin/pages/AdminUsers"));
const AdminUserDetail = lazyPage(() => import("@/features/admin/pages/AdminUserDetail"));
const AdminWorkspaces = lazyPage(() => import("@/features/admin/pages/AdminWorkspaces"));
const AdminWorkspaceDetail = lazyPage(
  () => import("@/features/admin/pages/AdminWorkspaceDetail"),
);
const AdminAudit = lazyPage(() => import("@/features/admin/pages/AdminAudit"));
const ReviewQueue = lazyPage(() => import("@/features/review/pages/ReviewQueue"));
const KitShowcasePage = lazyPage(() => import("@/features/dev/pages/KitShowcasePage"));

const LazyDocumentEditor = lazy(() => import("@/features/documents/pages/DocumentEditor"));

const protect = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>;
const guestOnly = (el: JSX.Element) => <RedirectIfAuthed>{el}</RedirectIfAuthed>;

const DocumentEditorRoute = () => {
  const { workspaceId = "", documentId = "" } = useParams();
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyDocumentEditor key={`${workspaceId}:${documentId}`} />
    </Suspense>
  );
};

export function AppRoutes() {
  return (
    <>
      <GlobalShortcuts />
      <ShortcutHelpDialog />
      <Routes>
        {/* Landing & auth */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={guestOnly(<Login />)} />
        <Route path="/register" element={guestOnly(<Register />)} />
        <Route path="/forgot-password" element={guestOnly(<ForgotPassword />)} />
        <Route path="/reset-password/:token" element={guestOnly(<ResetPassword />)} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        {import.meta.env.DEV ? <Route path="/_kit" element={<KitShowcasePage />} /> : null}

        {/* App shell */}
        <Route path="/dashboard" element={protect(<Dashboard />)} />
        <Route path="/workspaces" element={protect(<Workspaces />)} />
        <Route path="/workspaces/new" element={protect(<CreateWorkspace />)} />
        <Route path="/notifications" element={protect(<Notifications />)} />
        <Route path="/review" element={protect(<ReviewQueue />)} />

        {/* User settings */}
        <Route path="/settings" element={protect(<Settings />)} />
        <Route path="/settings/profile" element={protect(<SettingsProfile />)} />
        <Route path="/settings/password" element={protect(<SettingsPassword />)} />
        <Route path="/settings/notifications" element={protect(<SettingsNotifications />)} />
        <Route path="/settings/appearance" element={protect(<SettingsAppearance />)} />

        {/* Workspace — realtime layout joins workspace room for all child routes */}
        <Route path="/w/:workspaceId" element={protect(<WorkspaceRealtimeLayout />)}>
          <Route index element={<WorkspaceHome />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/new" element={<NewDocument />} />
          <Route path="documents/:documentId" element={<DocumentEditorRoute />} />
          <Route path="documents/:documentId/history" element={<DocumentHistory />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/list" element={<TasksList />} />
          <Route path="tasks/new" element={<Tasks />} />
          <Route path="tasks/:taskId" element={<TaskDetail />} />
          <Route path="members/user/:userId" element={<WorkspaceMemberProfile />} />
          <Route path="members" element={<Members />} />
          <Route path="activity" element={<Activity />} />
          <Route path="files" element={<Files />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="templates" element={<Templates />} />
          <Route path="settings" element={<WorkspaceSettings />} />
          <Route path="settings/members" element={<WorkspaceSettings />} />
        </Route>

        {/* Admin (RequireAuth + AdminGuard inside each page) */}
        <Route path="/admin" element={protect(<AdminDashboard />)} />
        <Route path="/admin/users" element={protect(<AdminUsers />)} />
        <Route path="/admin/users/:userId" element={protect(<AdminUserDetail />)} />
        <Route path="/admin/workspaces" element={protect(<AdminWorkspaces />)} />
        <Route path="/admin/workspaces/:workspaceId" element={protect(<AdminWorkspaceDetail />)} />
        <Route path="/admin/audit" element={protect(<AdminAudit />)} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
