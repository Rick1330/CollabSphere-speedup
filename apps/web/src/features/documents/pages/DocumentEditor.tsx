import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileX, RefreshCw, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCollaborativeDocumentEditor } from "@/hooks/use-collaborative-document-editor";
import { useIsBelowLg } from "@/hooks/use-is-below-lg";
import { isDocumentTreeVisible, toggleDocumentTreePanel } from "@/features/documents/lib/editor-panel-toggles";
import { useCommentSelectionFilter } from "@/features/documents/hooks/use-comment-selection-filter";
import { useDocumentComments } from "@/features/documents/hooks/use-document-comments";
import { useDocumentThreadFocus } from "@/features/documents/hooks/use-document-thread-focus";
import { AVATAR_COLORS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocumentTree } from "@/features/documents/hooks/use-document-tree";
import type { TreeContentPermissions } from "@/features/documents/components/document-tree";
import { getRolePermissions, type WorkspaceRoleKey } from "@/lib/persona-scenario";
import { listWorkspaceMembers } from "@/api/adapters/tasks";
import { fetchWorkspaceSidebarContext } from "@/api/adapters/workspaces";
import {
  fetchWorkspaceDocument,
  createDocument,
  createDocumentVersion,
  createWorkspaceFolder,
} from "@/api/adapters/documents";
import { ApiError } from "@/api/client";
import type { EditorDocument } from "@/features/documents/components/editor/editor-header";
import { EditorShell, TopBar, MenuBar, StatusBar } from "@/components/editor/shell";
import { LeftRail } from "@/components/editor/left/LeftRail";
import { LeftPanel } from "@/components/editor/left/LeftPanel";
import { LeftPanelContent } from "@/components/editor/left/panels/LeftPanelContent";
import { RightRail } from "@/components/editor/right/RightRail";
import { RightPanel } from "@/components/editor/right/RightPanel";
import { RightPanelContent } from "@/components/editor/right/panels/RightPanelContent";
import {
  EditorReadOnlyBanner,
  type ReadOnlyReason,
} from "@/features/documents/components/editor/editor-readonly-banner";
import { DocumentLoadingOverlay } from "@/components/editor/DocumentLoadingOverlay";
import { Toolbar } from "@/components/editor/shell/Toolbar";
import { EditorContentArea } from "@/features/documents/components/editor/editor-content";
import { CollabCaretDebug } from "@/features/documents/components/editor/collab-caret-debug";
import { RemotePointerOverlay } from "@/features/documents/components/editor/remote-pointer-overlay";
import { EditorSlashCommand } from "@/features/documents/components/editor/editor-slash-command";
import type { ConnectionStatus, SaveStatus } from "@/features/documents/components/editor/editor-status-bar";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import type { DocumentLinkedTaskEntry } from "@/features/documents/components/editor/editor-context-rail";
import { useDocumentReadiness } from "@/features/documents/hooks/use-document-readiness";
import { useEditorZoomShortcuts } from "@/features/documents/hooks/use-editor-zoom-shortcuts";
import { useEditorVersionHistoryShortcuts } from "@/features/documents/hooks/use-editor-version-history-shortcuts";
import { VersionHistoryOverlay } from "@/features/documents/components/version-history-overlay";
import {
  computeFitPageLevel,
  computeFitWidthLevel,
} from "@/features/documents/lib/compute-fit-zoom";
import { useFocusModeShortcut } from "@/components/editor/canvas/use-focus-mode-shortcut";
import { useEditorChromeDark } from "@/components/editor/hooks/use-editor-appearance";
import "@/components/editor/styles/tokens.css";
import { FocusModeToolbarPill } from "@/components/editor/canvas/FocusModeToolbarPill";
import { Ruler } from "@/components/editor/canvas/Ruler";
import { getTemplateContract } from "@/features/documents/template-schema";
import {
  useEditorStore,
  type LeftSidebarTab,
  type RightSidebarTab,
} from "@/features/documents/stores/use-editor-store";
import { DocumentTreePanel } from "@/features/documents/components/tree/document-tree-panel";
import { TreeCreateDialog } from "@/features/documents/components/tree-create-dialog";
import { DocumentInlineCommentTrigger } from "@/features/documents/components/comments/document-inline-comment-trigger";
import {
  EDITOR_COMMENT_COMPOSE_EVENT,
  type EditorCommentComposeDetail,
  type PendingCommentState,
} from "@/features/documents/lib/editor-comment-events";
import {
  clearPendingCommentMark,
  promotePendingCommentMark,
  setCommentMarkResolved,
} from "@/features/documents/lib/comment-mark-utils";
import { EditorSubmitDialog } from "@/features/documents/components/editor/editor-submit-dialog";
import { EditorReviewPanel } from "@/features/documents/components/editor/editor-review-panel";
import { EditorReviewFeedback } from "@/features/documents/components/editor/editor-review-feedback";
import { EditorSubmissionHistory } from "@/features/documents/components/editor/editor-submission-history";
import { TableInsertDialog } from "@/features/documents/components/editor/table-insert-dialog";
import { PageSetupDialog } from "@/components/editor/dialogs/PageSetupDialog";
import type { SubmissionRecord } from "@/lib/mock-academic";
import { decideOnSubmission, fetchDocumentHistory, submitForReview } from "@/api/adapters/review";
import type { CommentNode } from "@/lib/mock-comments";
import {
  buildDocumentSeed,
  clearPendingDoc,
  readPendingDoc,
  stashPendingDoc,
} from "@/api/adapters/templates";
import { resolveDocumentParam, resolveWorkspaceParam } from "@/lib/route-params";
import { useCurrentAccount } from "@/lib/auth-session";
import { useAuthBootstrap } from "@/lib/auth-bootstrap-context";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";
import {
  CreateTaskDialog,
  type SourceDocumentLink,
} from "@/features/tasks/components/create-task-dialog";
import {
  STATUS_LABELS,
  type TaskAssignee,
  type TaskDetail,
  type TaskLinkedResource,
  type TaskPriority,
  type TaskStatus,
} from "@/api/adapters/tasks";
function readCommentsPanelOpenDefault(): boolean {
  const saved = localStorage.getItem("collab-editor-comments-panel");
  if (saved !== null) return saved === "true";
  const legacy = localStorage.getItem("collab-editor-comments");
  if (legacy !== null) return legacy === "true";
  return true;
}

type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
type WorkspaceStatus = "active" | "archived";

interface MockWorkspace {
  id: string;
  name: string;
  status: WorkspaceStatus;
  myRole: WorkspaceRole;
  /** Enables academic submit-for-review workflow. */
  isAcademic: boolean;
  type: "professional" | "academic" | "general";
  permissions?: TreeContentPermissions;
}

interface MockDocument extends EditorDocument {
  content: string;
  createdBy: { id: string; fullName: string };
  /** Optional template-contract id (see template-schema.ts). */
  templateId?: string | null;
}

const CURRENT_USER_ID = "user-jane";

const WORKSPACES: Record<string, MockWorkspace> = {
  alpha: { id: "alpha", name: "Project Alpha", status: "active", myRole: "ADMIN", isAcademic: false, type: "professional" },
  thesis: { id: "thesis", name: "Thesis", status: "active", myRole: "MEMBER", isAcademic: true, type: "academic" },
  personal: { id: "personal", name: "Personal Notes", status: "active", myRole: "OWNER", isAcademic: false, type: "general" },
  research: { id: "research", name: "Research Group", status: "archived", myRole: "MEMBER", isAcademic: true, type: "academic" },
};

const SAMPLE_CONTENT = `
<h1>Project Roadmap Q4</h1>
<p>This document outlines the key deliverables, milestones, and team assignments for the upcoming quarter. All sections are open for collaborative editing — leave inline comments where you'd like clarification.</p>

<h2>Key Milestones</h2>
<ul>
  <li><strong>Beta release</strong> — October 15</li>
  <li><strong>User testing round 2</strong> — November 1</li>
  <li><strong>Production launch</strong> — December 1</li>
</ul>

<h2>Technical Requirements</h2>
<blockquote><p>All API endpoints must follow the standard response envelope format. Versioning lives in the URL prefix.</p></blockquote>
<p>Reference example response shape:</p>
<pre><code>{
  "data": { "document": { "id": "...", "title": "..." } },
  "meta": { "requestId": "req_abc123" }
}</code></pre>

<h2>Open Questions</h2>
<ol>
  <li>Should we ship dark mode in v1.1 or v1.2?</li>
  <li>How do we want to handle <code>archived</code> workspaces in search?</li>
</ol>
<p>Reach out in <a href="https://example.com">#product-roadmap</a> if you want to discuss live.</p>
`.trim();

const DOCUMENTS: Record<string, MockDocument> = {
  "d-roadmap": {
    id: "d-roadmap",
    title: "Project Roadmap Q4",
    status: "approved",
    isLocked: false,
    folderName: "Product",
    content: SAMPLE_CONTENT,
    createdBy: { id: "user-bob", fullName: "Eyob Bekele" },
  },
  "d-prd": {
    id: "d-prd",
    title: "PRD v2",
    status: "changes_requested",
    isLocked: true,
    lockedBy: { id: "user-bob", fullName: "Eyob Bekele" },
    folderName: "Product",
    content: "<h1>PRD v2</h1><p>Draft requirements for the next release.</p>",
    createdBy: { id: "user-bob", fullName: "Eyob Bekele" },
    templateId: "doc-prd",
  },
  "d-survey": {
    id: "d-survey",
    title: "User survey results",
    status: "draft",
    isLocked: false,
    folderName: "Research",
    content: "<h1>User survey results</h1><p>Highlights from the latest round.</p>",
    createdBy: { id: CURRENT_USER_ID, fullName: "Elshaday Tesfaye" },
    templateId: "doc-research-brief",
  },
  "d-api": {
    id: "d-api",
    title: "API Design",
    status: "submitted",
    isLocked: false,
    folderName: "Architecture",
    content: "<h1>API Design</h1><p>REST envelope conventions.</p>",
    createdBy: { id: CURRENT_USER_ID, fullName: "Elshaday Tesfaye" },
    templateId: "doc-rfc",
  },
  "d-adr": {
    id: "d-adr",
    title: "ADR-003 Prisma",
    status: "approved",
    isLocked: false,
    folderName: "Architecture",
    content: "<h1>ADR-003 Prisma</h1><p>We will adopt Prisma for the data layer.</p>",
    createdBy: { id: "user-bob", fullName: "Eyob Bekele" },
    templateId: "doc-adr",
  },
  "d-retro": {
    id: "d-retro",
    title: "Sprint Retro Week 12",
    status: "draft",
    isLocked: false,
    folderName: "Meetings",
    content: "<h1>Sprint Retro Week 12</h1><p>What went well, what didn't.</p>",
    createdBy: { id: CURRENT_USER_ID, fullName: "Elshaday Tesfaye" },
    templateId: "doc-meeting-notes",
  },
  "d-readme": {
    id: "d-readme",
    title: "README",
    status: "approved",
    isLocked: false,
    folderName: null,
    content: "<h1>README</h1><p>Welcome to the workspace.</p>",
    createdBy: { id: CURRENT_USER_ID, fullName: "Elshaday Tesfaye" },
  },
};

const FALLBACK_DOC: MockDocument = {
  id: "untitled",
  title: "Untitled document",
  status: "draft",
  isLocked: false,
  folderName: null,
  content:
    "<h1>Untitled document</h1><p>Start writing your first paragraph here. Press <code>/</code> for commands (coming soon).</p>",
  createdBy: { id: CURRENT_USER_ID, fullName: "Elshaday Tesfaye" },
};

function formatAnchorSnippet(snippet: string): string {
  return `"${snippet.slice(0, 60)}${snippet.length > 60 ? "…" : ""}"`;
}

function findDecoratedAnchorTarget(scroller: HTMLDivElement, snippet: string): HTMLElement | null {
  const fallback = scroller.querySelector("[data-comment-thread-id]") as HTMLElement | null;
  const matching = Array.from(scroller.querySelectorAll<HTMLElement>("[data-comment-thread-id]")).find(
    (node) => node.textContent?.includes(snippet),
  );
  return matching ?? fallback;
}

function flashAnchorTarget(target: HTMLElement): void {
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("comment-anchor--flash");
  window.setTimeout(() => target.classList.remove("comment-anchor--flash"), 1300);
}

function jumpToRawSnippet(scroller: HTMLDivElement, snippet: string): boolean {
  const walker = document.createTreeWalker(scroller, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.textContent && node.textContent.includes(snippet)) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      scroller.scrollTo({
        top: scroller.scrollTop + rect.top - scroller.clientHeight / 2,
        behavior: "smooth",
      });
      toast.success("Jumped to linked passage", {
        description: formatAnchorSnippet(snippet),
        duration: 2000,
      });
      return true;
    }
    node = walker.nextNode();
  }
  return false;
}

function jumpToAnchorSnippet(scroller: HTMLDivElement, snippet: string): void {
  const target = findDecoratedAnchorTarget(scroller, snippet);
  if (target) {
    flashAnchorTarget(target);
    return;
  }
  if (!jumpToRawSnippet(scroller, snippet)) {
    toast.info("Linked passage not found", {
      description: "The text may have been edited.",
    });
  }
}

function getReadOnlyReason(
  doc: MockDocument,
  ws: MockWorkspace,
  currentUserId: string,
): ReadOnlyReason | null {
  if (ws.status === "archived") return "workspace-archived";
  if (doc.status === "archived") return "archived";
  if (ws.myRole === "VIEWER") return "viewer";
  if (doc.isLocked) {
    const isLockOwner = doc.lockedBy?.id === currentUserId;
    const isAdminOrOwner = ws.myRole === "OWNER" || ws.myRole === "ADMIN";
    if (!isLockOwner && !isAdminOrOwner) return "locked";
  }
  // Submitted: read-only for everyone except supervisors (who use the review panel)
  if (doc.status === "submitted") {
    const isSupervisor =
      ws.myRole === "OWNER" || ws.myRole === "ADMIN" || ws.myRole === "MANAGER";
    if (!isSupervisor) return "submitted";
    // Supervisors review via the panel — keep editor read-only during review.
    return "submitted";
  }
  if (doc.status === "approved") {
    const isSupervisor =
      ws.myRole === "OWNER" || ws.myRole === "ADMIN" || ws.myRole === "MANAGER";
    if (!isSupervisor) return "approved";
  }
  // changes_requested: editable for the submitter (doc creator) so they can fix.
  return null;
}

// ---------- Tree skeleton (left panel during load) ----------
const TreeSkeleton = () => (
  <div className="flex flex-col h-full bg-stone-50/60 border-r border-stone-200">
    <div className="h-12 px-3 border-b border-stone-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-2 w-16 rounded" />
        </div>
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
    <div className="flex-1 px-2 py-3 space-y-1.5">
      <Skeleton className="h-6 w-full rounded" />
      <div className="pl-5 space-y-1.5">
        <Skeleton className="h-6 w-[90%] rounded" />
        <Skeleton className="h-6 w-[85%] rounded bg-teal-100/60" />
        <Skeleton className="h-6 w-[80%] rounded" />
      </div>
      <Skeleton className="h-6 w-full rounded" />
      <div className="pl-5 space-y-1.5">
        <Skeleton className="h-6 w-[88%] rounded" />
        <Skeleton className="h-6 w-[78%] rounded" />
      </div>
      <Skeleton className="h-6 w-full rounded" />
    </div>
  </div>
);

const EditorCenterSkeleton = () => (
  <div className="flex-1 min-w-0 flex flex-col bg-white">
    <div className="flex items-center gap-3 h-12 px-4 border-b border-stone-200 shrink-0">
      <Skeleton className="h-7 w-7 rounded-md" />
      <Skeleton className="h-4 w-12 rounded" />
      <Skeleton className="h-3 w-3 rounded" />
      <Skeleton className="h-4 w-32 rounded" />
      <div className="flex-1" />
      <div className="flex -space-x-1.5">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
    <div className="flex items-center gap-1 h-10 px-4 border-b border-stone-100 shrink-0">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-7 rounded-md" />
      ))}
    </div>
    <div className="flex-1 bg-white overflow-hidden">
      <div className="max-w-3xl mx-auto px-10 py-12 space-y-4">
        <Skeleton className="h-9 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <div className="h-6" />
        <Skeleton className="h-6 w-1/2 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
    </div>
    <div className="flex items-center justify-between h-8 px-4 border-t border-stone-100 bg-stone-50/50 shrink-0">
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  </div>
);

const EditorShellSkeleton = () => (
  <div className="flex h-screen bg-[var(--surface-2)]">
    <div className="hidden lg:flex w-[280px] shrink-0">
      <TreeSkeleton />
    </div>
    <EditorCenterSkeleton />
  </div>
);

interface DocumentEditorState {
  status: "loading" | "error" | "loaded";
  doc: MockDocument | null;
  workspace: MockWorkspace | null;
}

const DocumentEditorPage = () => {
  const params = useParams();
  const location = useLocation();
  const account = useCurrentAccount();
  const effectiveUserId = account?.id ?? CURRENT_USER_ID;
  const rawWorkspaceId = params.workspaceId?.trim() ?? "";
  const workspaceId = useMemo(
    () => resolveWorkspaceParam(params.workspaceId, account?.defaultWorkspaceId),
    [params.workspaceId, account?.defaultWorkspaceId],
  );
  const documentId = resolveDocumentParam(params.documentId);
  const isBelowLg = useIsBelowLg();
  const navigate = useNavigate();
  const { isSessionReady } = useAuthBootstrap();

  useEffect(() => {
    if (!rawWorkspaceId || isDatabaseWorkspaceId(rawWorkspaceId)) return;
    if (!isDatabaseWorkspaceId(workspaceId)) return;
    const nextPath = location.pathname.replace(`/w/${rawWorkspaceId}`, `/w/${workspaceId}`);
    if (nextPath !== location.pathname) {
      navigate(`${nextPath}${location.search}`, { replace: true });
    }
  }, [rawWorkspaceId, workspaceId, location.pathname, location.search, navigate]);

  // Adapter-driven data: tree + assignable workspace members.
  const { tree: documentTree, reload: reloadDocumentTree } = useDocumentTree(workspaceId);
  const [workspaceMembers, setWorkspaceMembers] = useState<TaskAssignee[]>([]);
  useEffect(() => {
    if (!isSessionReady) return;
    let cancelled = false;
    listWorkspaceMembers(workspaceId)
      .then((m) => {
        if (!cancelled) setWorkspaceMembers(m);
      })
      .catch(() => {
        if (!cancelled) setWorkspaceMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isSessionReady]);

  const membersById = useMemo(
    () => new Map(workspaceMembers.map((member) => [member.id, member])),
    [workspaceMembers],
  );

  const commentCurrentUser = useMemo(
    () => ({
      id: effectiveUserId,
      fullName: account?.fullName ?? "You",
      avatarUrl: account?.avatarUrl ?? null,
    }),
    [effectiveUserId, account?.fullName, account?.avatarUrl],
  );

  const [state, setState] = useState<DocumentEditorState>({
    status: "loading",
    doc: null,
    workspace: null,
  });
  const [retryNonce, setRetryNonce] = useState(0);

  // Load workspace + document (API for UUID ids, mock catalog for legacy slugs).
  useEffect(() => {
    if (!isSessionReady) {
      setState({ status: "loading", doc: null, workspace: null });
      return;
    }

    let cancelled = false;
    setState({ status: "loading", doc: null, workspace: null });

    const liveWs = isDatabaseWorkspaceId(workspaceId);
    const liveDoc = documentId ? isDatabaseWorkspaceId(documentId) : false;

    if (liveWs && liveDoc) {
      void (async () => {
        try {
          const [{ sidebar, myRole }, apiDoc] = await Promise.all([
            fetchWorkspaceSidebarContext(workspaceId),
            fetchWorkspaceDocument(workspaceId, documentId),
          ]);
          if (cancelled) return;
          const pending = readPendingDoc(documentId);
          const folderName = apiDoc.folder?.name ?? null;
          const contentHtml = pending?.contentHTML ?? "";
          if (pending) clearPendingDoc(documentId);
          const doc: MockDocument = {
            id: apiDoc.id,
            title: apiDoc.title,
            status: apiDoc.status as MockDocument["status"],
            isLocked: apiDoc.isLocked,
            lockedBy: apiDoc.lockedByUser
              ? { id: apiDoc.lockedByUser.id, fullName: apiDoc.lockedByUser.fullName }
              : undefined,
            folderName,
            content: contentHtml,
            createdBy: { id: apiDoc.createdBy.id, fullName: apiDoc.createdBy.fullName },
            templateId: apiDoc.templateId ?? undefined,
          };
          const ws: MockWorkspace = {
            id: sidebar.id,
            name: sidebar.name,
            status: sidebar.status,
            myRole: myRole as MockWorkspace["myRole"],
            isAcademic: sidebar.type === "academic",
            type: sidebar.type,
            permissions: {
              canCreateContent:
                sidebar.status === "active" && sidebar.permissions.canCreateContent,
              canOrganizeContent:
                sidebar.status === "active" && sidebar.permissions.canOrganizeContent,
              canDeleteContent:
                sidebar.status === "active" && sidebar.permissions.canDeleteContent,
            },
          };
          setState({ status: "loaded", doc, workspace: ws });
        } catch (err) {
          if (!cancelled) {
            if (err instanceof ApiError && err.status === 401) {
              toast.error("Session expired — sign in again.");
            }
            setState({ status: "error", doc: null, workspace: null });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const t = window.setTimeout(() => {
      if (cancelled) return;
      const ws = WORKSPACES[workspaceId] ?? {
        id: workspaceId,
        name: workspaceId,
        status: "active" as const,
        myRole: "OWNER" as const,
        isAcademic: false,
        type: "general" as const,
      };
      const known = DOCUMENTS[documentId];
      const pending = !known ? readPendingDoc(documentId) : null;
      const doc: MockDocument = known
        ? { ...known }
        : pending
          ? {
              id: documentId,
              title: pending.title,
              status: "draft",
              isLocked: false,
              folderName: pending.folderName,
              content: pending.contentHTML,
              createdBy: { id: effectiveUserId, fullName: account?.fullName ?? "You" },
              templateId: pending.templateId,
            }
          : { ...FALLBACK_DOC, id: documentId || "untitled" };
      if (pending) clearPendingDoc(documentId);
      setState({ status: "loaded", doc, workspace: ws });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [workspaceId, documentId, retryNonce, effectiveUserId, account?.fullName, isSessionReady]);

  const { doc, workspace } = state;

  // Local doc mutations (lock/unlock, delete-flag)
  const [overrides, setOverrides] = useState<Partial<MockDocument>>({});
  useEffect(() => {
    setOverrides({});
  }, [documentId]);

  const mergedDoc: MockDocument | null = useMemo(
    () => (doc ? { ...doc, ...overrides } : null),
    [doc, overrides],
  );

  const treePermissions = (() => {
    if (!workspace) {
      return {
        canCreateContent: false,
        canOrganizeContent: false,
        canDeleteContent: false,
      };
    }
    const rp = getRolePermissions(workspace.myRole as WorkspaceRoleKey);
    const active = workspace.status === "active";
    return {
      canCreateContent: active && rp.canCreateContent,
      canOrganizeContent: active && rp.canOrganizeContent,
      canDeleteContent: active && rp.canDeleteContent,
    };
  })();

  // ─────── Academic submission state ───────
  // Per-document submission history (API-backed).
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!documentId) {
      setSubmissionHistory([]);
      return;
    }

    void (async () => {
      try {
        const history = await fetchDocumentHistory(documentId);
        if (!cancelled) setSubmissionHistory(history);
      } catch {
        if (!cancelled) setSubmissionHistory([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // ─────── Document Properties state ───────
  const [properties, setProperties] = useState<any>({});
  
  const handleUpdateProperties = (newProps: any) => {
    setProperties(newProps);
    toast.success("Properties updated", {
      description: "Document metadata has been saved.",
      duration: 1500,
    });
  };

  const readOnlyReason =
    mergedDoc && workspace ? getReadOnlyReason(mergedDoc, workspace, effectiveUserId) : null;
  const isEditable = state.status === "loaded" && readOnlyReason === null;
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const openVersionHistory = useCallback(() => {
    if (state.status !== "loaded") return;
    setIsVersionHistoryOpen(true);
  }, [state.status]);

  useEffect(() => {
    if (searchParams.get("history") !== "1" || state.status !== "loaded") return;
    setIsVersionHistoryOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("history");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, state.status]);

  useEditorVersionHistoryShortcuts(
    state.status === "loaded" && !isVersionHistoryOpen,
    openVersionHistory,
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveInFlightRef = useRef(false);

  useEffect(() => {
    if (mergedDoc) {
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedDoc?.id, mergedDoc?.content]);

  const editorScrollRef = useRef<HTMLDivElement>(null);
  const writingColumnRef = useRef<HTMLDivElement>(null);
  const onThreadClickRef = useRef<(threadId: string) => void>(() => {});

  const [docxImporting, setDocxImporting] = useState(false);
  const [docxImportProgress, setDocxImportProgress] = useState<number | null>(null);

  const handleDocxImportStateChange = useCallback(
    (importState: { importing: boolean; progress: number | null }) => {
      setDocxImporting(importState.importing);
      setDocxImportProgress(importState.progress);
    },
    [],
  );

  const collab = useCollaborativeDocumentEditor({
    workspaceId: isDatabaseWorkspaceId(workspaceId) ? workspaceId : "",
    documentId: documentId && isDatabaseWorkspaceId(documentId) ? documentId : "",
    isSessionReady,
    user: {
      id: effectiveUserId,
      fullName: account?.fullName ?? "You",
      avatarUrl: account?.avatarUrl ?? null,
    },
    readOnly: !isEditable,
    properties: { ...properties, title: mergedDoc?.title },
    pointerRootRef: writingColumnRef,
    onThreadClick: (threadId) => onThreadClickRef.current(threadId),
  });
  const editor = collab.editor;

  const handleDocxImportStart = useCallback(() => {
    collab.pauseCollabForImport();
  }, [collab]);

  // ─────── Template readiness (submit gating) ───────
  const templateContract = useMemo(
    () => getTemplateContract(mergedDoc?.templateId),
    [mergedDoc?.templateId],
  );
  const readiness = useDocumentReadiness(editor, templateContract);

  const chromeDark = useEditorChromeDark();
  const hydratePageWidth = useEditorStore((s) => s.hydratePageWidth);
  const hydrateZoomLevel = useEditorStore((s) => s.hydrateZoomLevel);
  const hydratePageSetup = useEditorStore((s) => s.hydratePageSetup);
  const hydrateDocumentPageTheme = useEditorStore((s) => s.hydrateDocumentPageTheme);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const showRuler = useEditorStore((s) => s.showRuler);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);
  useEffect(() => {
    hydratePageWidth();
    hydrateZoomLevel();
    hydratePageSetup();
    hydrateDocumentPageTheme();
  }, [hydratePageWidth, hydrateZoomLevel, hydratePageSetup, hydrateDocumentPageTheme]);

  useEditorZoomShortcuts(state.status === "loaded");

  useEffect(() => {
    if (!editor) return;
    let debounceTimer: number | null = null;
    let autosaveTimer: number | null = null;
    const AUTOSAVE_IDLE_MS = 2500;
    const onUpdate = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        setSaveStatus("unsaved");
      }, 300);

      if (autosaveTimer) window.clearTimeout(autosaveTimer);
      autosaveTimer = window.setTimeout(() => {
        autosaveTimer = null;

        if (!isEditable) return;
        if (!mergedDoc) return;
        if (!isDatabaseWorkspaceId(workspaceId) || !isDatabaseWorkspaceId(documentId)) return;
        if (collab.status === "offline" || collab.status === "auth_failed" || collab.status === "error") return;
        if (autosaveInFlightRef.current) return;

        autosaveInFlightRef.current = true;
        setSaveStatus("saving");

        void (async () => {
          try {
            await createDocumentVersion(workspaceId, mergedDoc.id, {
              versionLabel: `auto-${Date.now().toString(36)}`,
            });
            setSaveStatus("saved");
            setLastSavedAt(new Date().toISOString());
          } catch {
            setSaveStatus("error");
          } finally {
            autosaveInFlightRef.current = false;
          }
        })();
      }, AUTOSAVE_IDLE_MS);
    };
    editor.on("update", onUpdate);
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      if (autosaveTimer) window.clearTimeout(autosaveTimer);
      editor.off("update", onUpdate);
    };
  }, [editor, isEditable, mergedDoc?.id, workspaceId, documentId, collab.status]);

  // Focus mode + comments rail + mobile drawers
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem("collab-editor-focus") === "true";
  });
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(readCommentsPanelOpenDefault);
  const [contextRailCollapsed, setContextRailCollapsed] = useState(
    () => !readCommentsPanelOpenDefault(),
  );
  const [selectionFilterBypass, setSelectionFilterBypass] = useState(false);
  const [treeOpen, setTreeOpen] = useState(() => {
    const saved = localStorage.getItem("collab-editor-tree");
    return saved === null ? true : saved === "true";
  });

  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [contextRailWidth, setContextRailWidth] = useState(332);
  const contextRailResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (focusMode || contextRailCollapsed) return;
    const onMove = (event: PointerEvent) => {
      if (!contextRailResizeRef.current) return;
      const delta = contextRailResizeRef.current.startX - event.clientX;
      const nextWidth = Math.max(280, Math.min(460, contextRailResizeRef.current.startWidth + delta));
      setContextRailWidth(nextWidth);
    };
    const onUp = () => {
      contextRailResizeRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [focusMode, contextRailCollapsed]);

  useEffect(() => {
    localStorage.setItem("collab-editor-focus", String(focusMode));
  }, [focusMode]);

  useEffect(() => {
    localStorage.setItem("collab-editor-comments-panel", String(commentsPanelOpen));
  }, [commentsPanelOpen]);

  useEffect(() => {
    if (!focusMode) return;
    setCommentsPanelOpen(false);
    setContextRailCollapsed(true);
    setMobileCommentsOpen(false);
  }, [focusMode]);

  useEffect(() => {
    localStorage.setItem("collab-editor-tree", String(treeOpen));
  }, [treeOpen]);

  // Comment system
  const {
    threads: allThreads,
    visibleThreads,
    filter,
    setFilter,
    openCount,
    resolvedCount,
    createThread,
    replyToThread,
    toggleResolve,
  } = useDocumentComments({
    workspaceId,
    documentId: mergedDoc?.id ?? "",
    currentUser: commentCurrentUser,
  });
  const { activeThreadId, focusThread, flashAnchorId, flashAnchor } =
    useDocumentThreadFocus();
  const flashAnchorClassTimeoutRef = useRef<number | null>(null);

  const [pendingComment, setPendingComment] = useState<PendingCommentState | null>(null);
  // Pending "create task from selection" snippet
  const [pendingTaskSnippet, setPendingTaskSnippet] = useState<string | null>(null);
  const [sessionLinkedTasks, setSessionLinkedTasks] = useState<DocumentLinkedTaskEntry[]>([]);
  const leftSidebarTab = useEditorStore((s) => s.leftSidebarTab);
  const setLeftSidebarTab = useEditorStore((s) => s.setLeftSidebarTab);
  const rightSidebarTab = useEditorStore((s) => s.rightSidebarTab);
  const setRightSidebarTab = useEditorStore((s) => s.setRightSidebarTab);

  const connectionStatus = useMemo((): ConnectionStatus => {
    if (collab.status === "synced") {
      return "connected";
    }
    if (collab.status === "connected") {
      return "connecting";
    }
    if (collab.status === "offline" || collab.status === "auth_failed" || collab.status === "error") {
      return "offline";
    }
    if (collab.status === "connecting") {
      return "connecting";
    }
    return "reconnecting";
  }, [collab.status]);

  const headerPresence: PresenceUser[] = useMemo(() => {
    if (collab.presenceUsers.length > 0) {
      return collab.presenceUsers;
    }
    if (!account) return [];
    return [
      {
        id: effectiveUserId,
        fullName: account.fullName,
        color: AVATAR_COLORS[0],
        profileHref: "/settings/profile",
        roleLabel: "You",
        statusLabel: "Editing now",
      },
    ];
  }, [collab.presenceUsers, account, effectiveUserId]);

  const openContextRailTab = useCallback(
    (tab: RightSidebarTab) => {
      setRightSidebarTab(tab);
      setCommentsPanelOpen(true);
      setContextRailCollapsed(false);
      if (isBelowLg) {
        setMobileCommentsOpen(true);
      }
    },
    [isBelowLg, setRightSidebarTab],
  );

  const handleLeftRailSelect = useCallback(
    (tab: LeftSidebarTab) => {
      if (!isBelowLg && tab === leftSidebarTab && treeOpen && !focusMode) {
        setTreeOpen(false);
        return;
      }
      setLeftSidebarTab(tab);
      if (isBelowLg) {
        setMobileTreeOpen(true);
        return;
      }
      setTreeOpen(true);
      if (focusMode) {
        setFocusMode(false);
      }
    },
    [focusMode, isBelowLg, leftSidebarTab, setLeftSidebarTab, treeOpen],
  );

  const handleRightRailSelect = useCallback(
    (tab: RightSidebarTab) => {
      const panelVisible = commentsPanelOpen && !contextRailCollapsed;
      if (!isBelowLg && tab === rightSidebarTab && panelVisible && !focusMode) {
        setCommentsPanelOpen(false);
        setContextRailCollapsed(true);
        return;
      }
      openContextRailTab(tab);
    },
    [
      commentsPanelOpen,
      contextRailCollapsed,
      focusMode,
      isBelowLg,
      openContextRailTab,
      rightSidebarTab,
    ],
  );

  const openCommentsPanel = useCallback(() => {
    openContextRailTab("comments");
  }, [openContextRailTab]);

  const handleJumpToTaskSnippet = useCallback(
    (snippet: string) => {
      const scroller = editorScrollRef.current;
      if (!scroller || !snippet.trim()) return;
      jumpToAnchorSnippet(scroller, snippet);
    },
    [],
  );

  const handleFitWidth = useCallback(() => {
    const outer = editorScrollRef.current;
    const page = writingColumnRef.current;
    if (!outer || !page) return;
    setZoomLevel(computeFitWidthLevel(outer, page, zoomLevel));
  }, [zoomLevel, setZoomLevel]);

  const handleFitPage = useCallback(() => {
    const outer = editorScrollRef.current;
    const page = writingColumnRef.current;
    if (!outer || !page) return;
    setZoomLevel(computeFitPageLevel(outer, page, zoomLevel));
  }, [zoomLevel, setZoomLevel]);

  useFocusModeShortcut(
    state.status === "loaded",
    focusMode,
    () => setFocusMode((f) => !f),
    () => setFocusMode(false),
  );

  const handleAnchorClick = useCallback(
    (threadId: string) => {
      focusThread(threadId);
      openCommentsPanel();
    },
    [focusThread, openCommentsPanel],
  );

  useEffect(() => {
    onThreadClickRef.current = handleAnchorClick;
  }, [handleAnchorClick]);

  useEffect(() => {
    const handleCompose = (event: Event) => {
      const detail = (event as CustomEvent<EditorCommentComposeDetail>).detail;
      if (!detail) return;
      setPendingComment(detail);
      openCommentsPanel();
    };
    document.addEventListener(EDITOR_COMMENT_COMPOSE_EVENT, handleCompose);
    return () => document.removeEventListener(EDITOR_COMMENT_COMPOSE_EVENT, handleCompose);
  }, [openCommentsPanel]);

  const handleClearSelectionFilterBypass = useCallback(() => {
    setSelectionFilterBypass(false);
  }, []);

  const handleClearSelectionFilter = useCallback(() => {
    setSelectionFilterBypass(true);
  }, []);

  useEffect(() => {
    setPendingComment(null);
    setSessionLinkedTasks([]);
  }, [mergedDoc?.id]);

  const handleCancelPendingComment = useCallback(() => {
    if (!editor || !pendingComment) {
      setPendingComment(null);
      return;
    }
    clearPendingCommentMark(editor, { from: pendingComment.from, to: pendingComment.to });
    setPendingComment(null);
  }, [editor, pendingComment]);

  const handleSubmitAnchoredComment = useCallback(
    async (body: CommentNode[]) => {
      if (!editor || !pendingComment) return;
      const pending = pendingComment;
      try {
        const threadId = await createThread({
          body,
          anchorSnippet: pending.quote,
          anchorFrom: pending.from,
          anchorTo: pending.to,
        });
        promotePendingCommentMark(
          editor,
          { from: pending.from, to: pending.to },
          threadId,
        );
        setPendingComment(null);
        focusThread(threadId);
        toast.success("Comment posted");
      } catch {
        clearPendingCommentMark(editor, { from: pending.from, to: pending.to });
        setPendingComment(null);
      }
    },
    [editor, pendingComment, createThread, focusThread],
  );

  const handleToggleComments = () => {
    if (isBelowLg) {
      setMobileCommentsOpen((open) => !open);
      return;
    }
    setCommentsPanelOpen((open) => {
      const next = !open;
      setContextRailCollapsed(!next);
      return next;
    });
  };

  const { railThreads, selectionFilterActive } = useCommentSelectionFilter(
    visibleThreads,
    editor,
    selectionFilterBypass,
    handleClearSelectionFilterBypass,
  );

  const handleJumpToAnchor = useCallback(
    (threadId: string) => {
      const scroller = editorScrollRef.current;
      if (!scroller) return;
      const el = scroller.querySelector(
        `[data-comment-thread-id="${threadId}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        flashAnchor(threadId);
        focusThread(threadId);
      } else {
        toast.info("Anchor text not found", {
          description: "The original text may have been edited.",
        });
      }
    },
    [flashAnchor, focusThread],
  );

  const handleCreateGeneralComment = useCallback(
    (body: CommentNode[]) => {
      createThread({ body });
      toast.success("Comment posted");
    },
    [createThread],
  );

  const handleReply = useCallback(
    (threadId: string, body: CommentNode[]) => {
      replyToThread(threadId, body);
    },
    [replyToThread],
  );

  const handleToggleResolve = useCallback(
    (threadId: string) => {
      const thread = allThreads.find((t) => t.id === threadId);
      if (!thread) return;
      const nextResolved = !thread.resolved;
      toggleResolve(threadId);
      if (editor) {
        setCommentMarkResolved(editor, threadId, nextResolved);
      }
      toast.success(nextResolved ? "Thread resolved" : "Thread reopened");
    },
    [allThreads, editor, toggleResolve],
  );

  const canComment =
    workspace?.status === "active" &&
    workspace?.myRole !== "VIEWER" &&
    readOnlyReason !== "archived";
  const canResolveThreads =
    workspace?.myRole === "OWNER" ||
    workspace?.myRole === "ADMIN" ||
    workspace?.myRole === "MANAGER";

  const commentRailData = useMemo(
    () => ({
      threads: railThreads,
      filter,
      openCount,
      resolvedCount,
      activeThreadId,
      canComment,
      canResolve: canResolveThreads,
      members: workspaceMembers,
      membersById,
      onFilterChange: setFilter,
      onCreate: handleCreateGeneralComment,
      onReply: handleReply,
      onToggleResolve: handleToggleResolve,
      onSelectThread: focusThread,
      onJumpToAnchor: handleJumpToAnchor,
      pendingComment,
      onSubmitAnchored: handleSubmitAnchoredComment,
      onCancelPending: handleCancelPendingComment,
      selectionFilterActive,
      onClearSelectionFilter: handleClearSelectionFilter,
    }),
    [
      railThreads,
      filter,
      openCount,
      resolvedCount,
      activeThreadId,
      canComment,
      canResolveThreads,
      workspaceMembers,
      membersById,
      handleCreateGeneralComment,
      handleReply,
      handleToggleResolve,
      focusThread,
      handleJumpToAnchor,
      pendingComment,
      handleSubmitAnchoredComment,
      handleCancelPendingComment,
      selectionFilterActive,
      handleClearSelectionFilter,
    ],
  );

  const handleContextRailResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (focusMode || contextRailCollapsed) return;
    contextRailResizeRef.current = {
      startX: event.clientX,
      startWidth: contextRailWidth,
    };
    setContextRailCollapsed(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  // Keep comment-mark anchors visually in sync with the focused thread.
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;

    root
      .querySelectorAll<HTMLElement>("[data-comment-thread-id]")
      .forEach((el) => el.classList.remove("comment-anchor--active"));

    if (!activeThreadId) return;

    const activeEl = root.querySelector<HTMLElement>(
      `[data-comment-thread-id="${CSS.escape(activeThreadId)}"]`,
    );
    activeEl?.classList.add("comment-anchor--active");
  }, [editor, activeThreadId]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;

    if (flashAnchorClassTimeoutRef.current) {
      window.clearTimeout(flashAnchorClassTimeoutRef.current);
      flashAnchorClassTimeoutRef.current = null;
    }

    root
      .querySelectorAll<HTMLElement>("[data-comment-thread-id]")
      .forEach((el) => el.classList.remove("comment-anchor--flash"));

    if (!flashAnchorId) return;

    const flashEl = root.querySelector<HTMLElement>(
      `[data-comment-thread-id="${CSS.escape(flashAnchorId)}"]`,
    );
    if (!flashEl) return;

    flashEl.classList.add("comment-anchor--flash");
    flashAnchorClassTimeoutRef.current = window.setTimeout(() => {
      flashEl.classList.remove("comment-anchor--flash");
    }, 1300);
  }, [editor, flashAnchorId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        toast.success("Document saved", {
          description: "All changes have been saved.",
          duration: 1800,
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setFocusMode((f) => {
          const next = !f;
          toast(next ? "Focus mode on" : "Focus mode off", {
            description: next
              ? "Side panels hidden. Press ⌘. to exit."
              : "Side panels restored.",
            duration: 1400,
          });
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Deep-link: scroll to and flash a snippet from `#anchor=` in the URL.
  useEffect(() => {
    if (!editor) return;
    const tryJump = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#anchor=")) return;
      const snippet = decodeURIComponent(hash.slice("#anchor=".length));
      if (!snippet) return;
      const scroller = editorScrollRef.current;
      if (!scroller) return;
      // Small delay so anchor decorations have a chance to mount.
      window.setTimeout(() => jumpToAnchorSnippet(scroller, snippet), 250);
    };
    tryJump();
    window.addEventListener("hashchange", tryJump);
    return () => window.removeEventListener("hashchange", tryJump);
  }, [editor, mergedDoc?.id]);

  // Close mobile tree drawer when navigating
  const handleTreeNavigate = () => {
    setMobileTreeOpen(false);
  };

  // Title
  useEffect(() => {
    if (mergedDoc) {
      window.document.title = `${mergedDoc.title} — CollabSphere`;
    } else {
      window.document.title = "Document — CollabSphere";
    }
  }, [mergedDoc]);

  // Tree panel quick-create dialogs
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTargetFolderId, setCreateTargetFolderId] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);

  const handleInsertTable = (rows: number, cols: number) => {
    (editor?.chain().focus() as any)
      ?.insertTable({ rows, cols, withHeaderRow: true })
      .run();
  };

  const handleCreateDoc = async (title: string, templateId: string) => {
    setCreateDocOpen(false);
    if (isDatabaseWorkspaceId(workspaceId)) {
      if (templateId && templateId !== "doc-blank") {
        const params = new URLSearchParams({ title, template: templateId });
        navigate(`/w/${workspaceId}/documents/new?${params.toString()}`);
        return;
      }
      try {
        const created = await createDocument(workspaceId, {
          title: title.trim(),
          folderId: createTargetFolderId,
          templateId: null,
        });
        setCreateTargetFolderId(null);
        reloadDocumentTree();
        toast.success(`Created "${created.title}"`, { description: "Opening new document…" });
        navigate(`/w/${workspaceId}/documents/${created.id}`);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not create document.";
        toast.error(msg);
      }
      return;
    }
    const newId = `doc-${Date.now().toString(36)}`;
    const seed = buildDocumentSeed(title, templateId, null);
    stashPendingDoc(newId, seed);
    toast.success(`Created "${seed.title}"`, {
      description:
        seed.templateId === "doc-blank"
          ? "Opening new document…"
          : `Seeded from ${seed.templateName}.`,
    });
    navigate(`/w/${workspaceId}/documents/${newId}`);
  };
  const handleCreateFolder = async (name: string) => {
    setCreateFolderOpen(false);
    if (isDatabaseWorkspaceId(workspaceId)) {
      try {
        await createWorkspaceFolder(workspaceId, { name: name.trim(), parentId: null });
        reloadDocumentTree();
        toast.success(`Created folder "${name.trim()}"`);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not create folder.";
        toast.error(msg);
      }
      return;
    }
    toast.success(`Created folder "${name}"`);
  };

  if (state.status === "loading") return <EditorShellSkeleton />;

  if (state.status === "error" || !mergedDoc || !workspace) {
    return (
      <div className="flex h-screen bg-[var(--surface-2)]">
        {!focusMode && (
          <div className="hidden lg:flex w-[280px] shrink-0">
            <DocumentTreePanel
              workspaceId={workspaceId}
              workspaceName={WORKSPACES[workspaceId]?.name ?? workspaceId}
              workspaceType={WORKSPACES[workspaceId]?.type ?? "general"}
              tree={documentTree}
              activeDocumentId={null}
              permissions={treePermissions}
            />
          </div>
        )}
        <div className="flex-1 flex items-center justify-center bg-white p-8">
          <div className="text-center max-w-sm">
            <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
              <FileX className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mt-4">Document not found</h2>
            <p className="text-sm text-stone-500 mt-1.5">
              This document may have been deleted or you don't have access.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
                className="h-9 px-4 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
              <Link
                to={`/w/${workspaceId}/documents`}
                className="h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium text-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to documents
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canLock =
    workspace.myRole === "OWNER" ||
    workspace.myRole === "ADMIN" ||
    workspace.myRole === "MANAGER";
  const canDelete =
    canLock ||
    (workspace.myRole === "MEMBER" && mergedDoc.createdBy.id === effectiveUserId);

  const handleToggleLock = () => {
    setOverrides((prev) => {
      const nowLocked = !mergedDoc.isLocked;
      toast.success(nowLocked ? "Document locked" : "Document unlocked");
      return {
        ...prev,
        isLocked: nowLocked,
        lockedBy: nowLocked
          ? { id: effectiveUserId, fullName: account?.fullName ?? "You" }
          : undefined,
      };
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${mergedDoc.title}"? This cannot be undone.`)) return;
    toast.success("Document deleted");
    navigate(`/w/${workspaceId}/documents`);
  };

  const handleTitleChange = (title: string) => {
    setOverrides((prev) => ({ ...prev, title }));
  };

  const leftPanelContentProps = {
    workspaceId,
    workspaceName: workspace.name,
    workspaceType: workspace.type,
    tree: documentTree,
    activeDocumentId: mergedDoc.id,
    permissions: treePermissions,
    onServerTreeChange: () => reloadDocumentTree(),
    onNavigate: handleTreeNavigate,
    editor,
    isV2Template: templateContract != null,
    scrollRootRef: editorScrollRef,
    collaboratorCount: headerPresence.length,
    lastSavedAt,
    openCommentCount: openCount,
    openTaskCount: sessionLinkedTasks.filter((e) => e.task.status !== "done").length,
  };

  const handleCreateTaskFromSelection = (
    task: TaskDetail,
    sourceLink?: TaskLinkedResource,
  ) => {
    setPendingTaskSnippet(null);
    if (sourceLink && mergedDoc) {
      setSessionLinkedTasks((prev) => [
        ...prev.filter((entry) => entry.task.id !== task.id),
        { task, link: sourceLink },
      ]);
      openContextRailTab("tasks");
    }
    toast.success("Task created from document", {
      description: `"${task.title}" added to ${STATUS_LABELS[task.status]}.`,
      action: {
        label: "View board",
        onClick: () => navigate(`/w/${workspaceId}/tasks`),
      },
    });
  };

  // ─────────── Academic workflow ───────────
  const isSupervisor =
    workspace.myRole === "OWNER" ||
    workspace.myRole === "ADMIN" ||
    workspace.myRole === "MANAGER";
  const isSubmitter = mergedDoc.createdBy.id === effectiveUserId;
  const academicEnabled = workspace.isAcademic && workspace.status === "active";

  // Most recent submission record (used for review panel + feedback banner)
  const latestSubmission: SubmissionRecord | undefined = submissionHistory[0];
  const pendingSubmission =
    latestSubmission && !latestSubmission.decision ? latestSubmission : undefined;
  const lastChangesRequested =
    latestSubmission && latestSubmission.decision === "changes_requested"
      ? latestSubmission
      : undefined;

  const academicSubmissionStatus =
    academicEnabled
      ? latestSubmission
        ? !latestSubmission.decision
          ? {
              label: "Submitted",
              tone: "warning" as const,
              versionLabel: latestSubmission.versionLabel,
            }
          : latestSubmission.decision === "approved"
            ? {
                label: "Approved",
                tone: "success" as const,
                versionLabel: latestSubmission.versionLabel,
              }
            : {
                label: "Changes requested",
                tone: "danger" as const,
                versionLabel: latestSubmission.versionLabel,
              }
        : { label: "Draft", tone: "neutral" as const }
      : undefined;

  // Surface visibility
  const showReviewPanel =
    academicEnabled &&
    isSupervisor &&
    mergedDoc.status === "submitted" &&
    !!pendingSubmission;
  const showFeedbackBanner =
    academicEnabled &&
    mergedDoc.status === "changes_requested" &&
    !!lastChangesRequested;
  const showSubmissionHistory = academicEnabled && submissionHistory.length > 0;

  // Submit eligibility (student perspective)
  const canSubmitForReview =
    academicEnabled &&
    !isSupervisor &&
    isSubmitter &&
    (mergedDoc.status === "draft" || mergedDoc.status === "changes_requested") &&
    workspace.myRole !== "VIEWER";

  const isResubmission = mergedDoc.status === "changes_requested";
  const docHasContent =
    !!editor && editor.getText().trim().length > 5;

  // Template-contract gate: when the contract enforces structure, prevent
  // submission until the readiness engine reports `blocksSubmit === false`.
  // Advisory contracts (and missing contracts) never gate.
  const readinessBlocks = !!readiness && readiness.blocksSubmit;
  const canSubmitNow = docHasContent && !readinessBlocks;
  const submitBlockReason = !docHasContent
    ? "This document is empty. Add some content before submitting."
    : readinessBlocks && readiness?.blockingReason
      ? readiness.blockingReason
      : undefined;

  // ── Submission handlers ──

  const nextVersionLabel = () => {
    const num = submissionHistory.length + 1;
    return `v${num}`;
  };

  const handleConfirmSubmit = (note: string | undefined) => {
    if (!mergedDoc) return;
    const versionLabel = nextVersionLabel();

    void (async () => {
      try {
        await submitForReview({
          documentId: mergedDoc.id,
          documentTitle: mergedDoc.title,
          studentId: effectiveUserId,
          studentName: account?.fullName ?? "You",
          submissionNote: note,
          versionLabel,
        });

        setOverrides((prev) => ({ ...prev, status: "submitted" }));
        setSubmitDialogOpen(false);

        const history = await fetchDocumentHistory(mergedDoc.id);
        setSubmissionHistory(history);

        toast.success(isResubmission ? "Resubmitted for review" : "Submitted for review", {
          description: "Your supervisor has been notified.",
        });
      } catch {
        toast.error("Could not submit for review.");
      }
    })();
  };

  const handleApprove = (note: string | undefined) => {
    if (!mergedDoc) return;
    if (!pendingSubmission) return;

    void (async () => {
      try {
        await decideOnSubmission({
          documentId: mergedDoc.id,
          decision: "approved",
          note,
        });
        setOverrides((prev) => ({ ...prev, status: "approved" }));

        const history = await fetchDocumentHistory(mergedDoc.id);
        setSubmissionHistory(history);

        toast.success("Document approved", {
          description: "The author has been notified.",
        });
      } catch {
        toast.error("Could not approve submission.");
      }
    })();
  };

  const handleRequestChanges = (note: string) => {
    if (!mergedDoc) return;
    if (!pendingSubmission) return;

    void (async () => {
      try {
        await decideOnSubmission({
          documentId: mergedDoc.id,
          decision: "changes_requested",
          note,
        });
        setOverrides((prev) => ({ ...prev, status: "changes_requested" }));

        const history = await fetchDocumentHistory(mergedDoc.id);
        setSubmissionHistory(history);

        toast.success("Changes requested", {
          description: "The author can now revise and resubmit.",
        });
      } catch {
        toast.error("Could not request changes.");
      }
    })();
  };

  const submitButton = canSubmitForReview ? (
    <button
      type="button"
      onClick={() => setSubmitDialogOpen(true)}
      className={cn(
        "h-7 px-2.5 rounded-md text-[12px] font-semibold transition-colors duration-100 flex items-center gap-1.5 shadow-sm",
        isResubmission
          ? "bg-amber-600 hover:bg-amber-500 text-white"
          : "bg-amber-600 hover:bg-amber-500 text-white",
      )}
      title={isResubmission ? "Resubmit for review" : "Submit for review"}
    >
      {isResubmission ? (
        <RotateCcw className="h-3.5 w-3.5" />
      ) : (
        <Send className="h-3.5 w-3.5" />
      )}
      <span className="hidden md:inline">
        {isResubmission ? "Resubmit" : "Submit for review"}
      </span>
    </button>
  ) : null;


  const handleToggleTree = () => {
    const next = toggleDocumentTreePanel(isBelowLg, { treeOpen, mobileTreeOpen });
    setTreeOpen(next.treeOpen);
    setMobileTreeOpen(next.mobileTreeOpen);
    if (!isBelowLg && focusMode) {
      setFocusMode(false);
    }
  };

  const editorBanners = (
    <>
      {showReviewPanel && pendingSubmission && (
        <EditorReviewPanel
          pendingSubmission={pendingSubmission}
          onApprove={handleApprove}
          onRequestChanges={handleRequestChanges}
        />
      )}
      {showFeedbackBanner && lastChangesRequested && (
        <EditorReviewFeedback
          lastDecision={lastChangesRequested}
          canResubmit={canSubmitForReview}
          onResubmit={() => setSubmitDialogOpen(true)}
        />
      )}
      {readOnlyReason && !showReviewPanel && !showFeedbackBanner && (
        <EditorReadOnlyBanner
          reason={readOnlyReason}
          lockedByName={mergedDoc.lockedBy?.fullName}
        />
      )}
      {showSubmissionHistory && (
        <EditorSubmissionHistory history={submissionHistory} />
      )}
      {(connectionStatus === "connecting" || collab.status === "connected") && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          {collab.status === "connected"
            ? "Syncing document for collaboration…"
            : "Connecting to collaboration server…"}
        </div>
      )}
    </>
  );

  const showCollabLoadingOverlay =
    !docxImporting &&
    state.status === "loaded" &&
    isDatabaseWorkspaceId(workspaceId) &&
    Boolean(documentId) &&
    !collab.isCollabReady &&
    collab.status !== "auth_failed" &&
    collab.status !== "error";

  const collabCanvasReady = !showCollabLoadingOverlay && !docxImporting;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-2)]">
      {docxImporting ? (
        <DocumentLoadingOverlay
          progress={docxImportProgress ?? 0}
          title="Importing DOCX…"
          statusLabelOverride={
            docxImportProgress != null
              ? `${Math.round(docxImportProgress)}% complete`
              : "Uploading and converting on server…"
          }
        />
      ) : showCollabLoadingOverlay ? (
        <DocumentLoadingOverlay progress={collab.loadProgress} />
      ) : null}
      {isBelowLg && (
        <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
          <SheetContent side="left" className="w-[300px] p-0 sm:w-[320px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Documents</SheetTitle>
            </SheetHeader>
            <div className="flex h-full">
              <LeftRail
                className="flex shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-3)] py-2"
                activeTab={leftSidebarTab}
                panelOpen={mobileTreeOpen}
                onSelectTab={handleLeftRailSelect}
              />
              <LeftPanel className="min-w-0 flex-1">
                <LeftPanelContent {...leftPanelContentProps} activeTab={leftSidebarTab} />
              </LeftPanel>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <EditorShell
        className={cn("min-w-0 flex-1", chromeDark && "dark")}
        focusMode={focusMode}
        leftPanelOpen={!focusMode && treeOpen}
        rightPanelOpen={!focusMode && !contextRailCollapsed && commentsPanelOpen}
        rightPanelWidth={contextRailWidth}
        onRightPanelResizeStart={handleContextRailResizeStart}
        topBar={
          <TopBar
            workspaceId={workspaceId}
            workspaceName={workspace.name}
            document={mergedDoc}
            presence={headerPresence}
            saveStatus={saveStatus}
            connectionStatus={connectionStatus}
            onTitleChange={isEditable ? handleTitleChange : undefined}
            canLock={canLock}
            canDelete={canDelete}
            onToggleLock={handleToggleLock}
            onDelete={handleDelete}
            onToggleTree={handleToggleTree}
            treeOpen={isDocumentTreeVisible(isBelowLg, { treeOpen, mobileTreeOpen })}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
            focusMode={focusMode}
            onToggleComments={handleToggleComments}
            commentsOpen={isBelowLg ? mobileCommentsOpen : commentsPanelOpen}
            commentsOpenCount={openCount}
            submitSlot={submitButton}
            onOpenVersionHistory={openVersionHistory}
          />
        }
        menuBar={
          <MenuBar
            editor={editor}
            readOnly={!isEditable}
            documentTitle={mergedDoc?.title}
            workspaceId={workspaceId}
            documentId={documentId}
            onToggleTree={handleToggleTree}
            onToggleComments={handleToggleComments}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
            onOpenVersionHistory={openVersionHistory}
            onOpenPageSetup={() => setPageSetupOpen(true)}
            onServerDocxImported={() => collab.hardReconnectAfterRestore()}
            onDocxImportStart={handleDocxImportStart}
            onDocxImportStateChange={handleDocxImportStateChange}
            isCollabActive={collab.isCollabReady}
          />
        }
        toolbar={
          <Toolbar
            editor={editor}
            isReadOnly={!isEditable || connectionStatus === "connecting"}
            onInsertTableRequest={() => setTableDialogOpen(true)}
            onToggleComments={handleToggleComments}
          />
        }
        banners={editorBanners}
        leftRail={
          <LeftRail
            activeTab={leftSidebarTab}
            panelOpen={treeOpen}
            onSelectTab={handleLeftRailSelect}
          />
        }
        leftPanel={
          <LeftPanel>
            <LeftPanelContent {...leftPanelContentProps} activeTab={leftSidebarTab} />
          </LeftPanel>
        }
        rightRail={
          <RightRail
            activeTab={rightSidebarTab}
            panelOpen={commentsPanelOpen && !contextRailCollapsed}
            openCount={openCount}
            onSelectTab={handleRightRailSelect}
          />
        }
        rightPanel={
          <RightPanel>
            <RightPanelContent
              workspaceId={workspaceId}
              documentId={documentId}
              currentUserId={effectiveUserId}
              presenceUsers={headerPresence}
              sessionLinkedTasks={sessionLinkedTasks}
              commentData={commentRailData}
              activeTab={rightSidebarTab}
              onJumpToTaskSnippet={handleJumpToTaskSnippet}
              onClose={() => {
                setCommentsPanelOpen(false);
                setContextRailCollapsed(true);
              }}
            />
          </RightPanel>
        }
        statusBar={
          <StatusBar
            editor={editor}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            connectionStatus={connectionStatus}
            collaboratorCount={headerPresence.length}
            isReadOnly={!isEditable}
            submissionStatus={academicSubmissionStatus}
            onOpenTeam={() => openContextRailTab("team")}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
          />
        }
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {focusMode ? (
            <FocusModeToolbarPill
              editor={editor}
              onExitFocus={() => setFocusMode(false)}
            />
          ) : null}
          {!focusMode && showRuler ? (
            <Ruler
              pageSetup={pageSetup}
              zoomLevel={zoomLevel}
              className="editor-print-hide shrink-0"
            />
          ) : null}
          {collabCanvasReady ? (
            <EditorContentArea
              ref={editorScrollRef}
              writingColumnRef={writingColumnRef}
              editor={editor}
              isV2Template={templateContract != null}
              focusMode={focusMode}
              readOnly={!isEditable}
              collabReady={collab.isCollabReady}
            >
              {collab.status === "synced" && (
                <RemotePointerOverlay clients={collab.awarenessSnapshot} />
              )}
            </EditorContentArea>
          ) : (
            <div
              ref={editorScrollRef}
              className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground"
              aria-busy="true"
            />
          )}
          {collab.provider && collabCanvasReady && (
            <CollabCaretDebug status={collab.status} clients={collab.awarenessSnapshot} />
          )}
          {isEditable && collabCanvasReady && (
            <EditorSlashCommand
              editor={editor}
              onInsertTableRequest={() => setTableDialogOpen(true)}
            />
          )}
          {isVersionHistoryOpen && mergedDoc && (
            <VersionHistoryOverlay
              workspaceId={workspaceId}
              documentId={documentId}
              documentTitle={mergedDoc.title}
              currentUserId={effectiveUserId}
              canRestore={isEditable}
              getLiveYjsState={collab.getLiveYjsState}
              onClose={() => setIsVersionHistoryOpen(false)}
              onRestored={() => {
                setIsVersionHistoryOpen(false);
                collab.hardReconnectAfterRestore();
              }}
            />
          )}
        </div>
      </EditorShell>

      {/* Floating selection-based comment trigger */}
      <DocumentInlineCommentTrigger
        editor={editor}
        enabled={!!editor && canComment}
        hideWhilePending={!!pendingComment || !!pendingTaskSnippet}
        onCreateTask={
          canComment ? (snippet) => setPendingTaskSnippet(snippet) : undefined
        }
      />

      {/* Mobile/tablet context drawer (right side) */}
      <Sheet open={mobileCommentsOpen} onOpenChange={setMobileCommentsOpen}>
        <SheetContent side="right" className="p-0 w-[340px] sm:w-[400px] xl:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Document context</SheetTitle>
          </SheetHeader>
          <div className="flex h-full">
            <RightRail
              className="flex shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-3)] py-2"
              activeTab={rightSidebarTab}
              panelOpen={mobileCommentsOpen}
              openCount={openCount}
              onSelectTab={handleRightRailSelect}
            />
            <RightPanel className="min-w-0 flex-1">
              <RightPanelContent
                workspaceId={workspaceId}
                documentId={documentId}
                currentUserId={effectiveUserId}
                presenceUsers={headerPresence}
                sessionLinkedTasks={sessionLinkedTasks}
                commentData={{
                  ...commentRailData,
                  onJumpToAnchor: (id) => {
                    handleJumpToAnchor(id);
                    setMobileCommentsOpen(false);
                  },
                }}
                activeTab={rightSidebarTab}
                onJumpToTaskSnippet={handleJumpToTaskSnippet}
                onClose={() => setMobileCommentsOpen(false)}
              />
            </RightPanel>
          </div>
        </SheetContent>
      </Sheet>

      {createDocOpen && (
        <TreeCreateDialog
          open
          kind="document"
          workspaceType={workspace.type}
          folderName={null}
          onClose={() => setCreateDocOpen(false)}
          onCreated={handleCreateDoc}
        />
      )}
      {createFolderOpen && (
        <TreeCreateDialog
          open
          kind="folder"
          parentName={null}
          onClose={() => setCreateFolderOpen(false)}
          onCreated={handleCreateFolder}
        />
      )}

      {/* Academic submit-for-review dialog */}
      {academicEnabled && (
        <EditorSubmitDialog
          open={submitDialogOpen}
          onOpenChange={setSubmitDialogOpen}
          documentTitle={mergedDoc.title}
          isResubmission={isResubmission}
          canSubmit={canSubmitNow}
          blockReason={submitBlockReason}
          onConfirm={handleConfirmSubmit}
        />
      )}

      {/* Create-task-from-selection dialog */}
      {pendingTaskSnippet && (
        <CreateTaskDialog
          workspaceId={workspaceId}
          presetStatus="todo"
          members={workspaceMembers}
          assignableMembers={
            ["OWNER", "ADMIN", "MANAGER"].includes(workspace.myRole)
              ? workspaceMembers
              : workspaceMembers.filter((m) => m.id === effectiveUserId)
          }
          currentUserId={effectiveUserId}
          sourceLink={{
            documentId: mergedDoc.id,
            documentTitle: mergedDoc.title,
            documentIcon: "📄",
            anchor: { snippet: pendingTaskSnippet, status: "ok" },
          }}
          onClose={() => setPendingTaskSnippet(null)}
          onCreated={handleCreateTaskFromSelection}
        />
      )}

      <TableInsertDialog
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
        onConfirm={handleInsertTable}
      />

      <PageSetupDialog open={pageSetupOpen} onOpenChange={setPageSetupOpen} />
    </div>
  );
};

export default DocumentEditorPage;
