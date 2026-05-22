import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileX, RefreshCw, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCollaborativeDocumentEditor } from "@/hooks/use-collaborative-document-editor";
import { useIsBelowLg } from "@/hooks/use-is-below-lg";
import {
  isContextRailVisible,
  isDocumentTreeVisible,
  toggleContextRailPanel,
  toggleDocumentTreePanel,
} from "@/features/documents/lib/editor-panel-toggles";
import { useDocumentComments } from "@/features/documents/hooks/use-document-comments";
import { useDocumentThreadFocus } from "@/features/documents/hooks/use-document-thread-focus";
import { useAnchorDecorations } from "@/features/documents/hooks/use-anchor-decorations";
import { AVATAR_COLORS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocumentTree } from "@/features/documents/hooks/use-document-tree";
import type { TreeContentPermissions } from "@/features/documents/components/document-tree";
import { getRolePermissions, type WorkspaceRoleKey } from "@/lib/persona-scenario";
import { listWorkspaceMembers } from "@/api/adapters/tasks";
import { fetchWorkspaceSidebarContext } from "@/api/adapters/workspaces";
import { fetchWorkspaceDocument, createDocument, createWorkspaceFolder } from "@/api/adapters/documents";
import { ApiError } from "@/api/client";
import { EditorHeader, type EditorDocument } from "@/features/documents/components/editor/editor-header";
import {
  EditorReadOnlyBanner,
  type ReadOnlyReason,
} from "@/features/documents/components/editor/editor-readonly-banner";
import { EditorToolbar } from "@/features/documents/components/editor/editor-toolbar";
import { EditorContentArea } from "@/features/documents/components/editor/editor-content";
import { CollabCaretDebug } from "@/features/documents/components/editor/collab-caret-debug";
import { RemotePointerOverlay } from "@/features/documents/components/editor/remote-pointer-overlay";
import { EditorSlashCommand } from "@/features/documents/components/editor/editor-slash-command";
import {
  EditorStatusBar,
  type ConnectionStatus,
  type SaveStatus,
} from "@/features/documents/components/editor/editor-status-bar";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import { EditorContextRail } from "@/features/documents/components/editor/editor-context-rail";
import { useDocumentOutline } from "@/features/documents/hooks/use-document-outline";
import { useDocumentReadiness } from "@/features/documents/hooks/use-document-readiness";
import { getTemplateContract } from "@/features/documents/template-schema";
import { DocumentTreePanel } from "@/features/documents/components/tree/document-tree-panel";
import { TreeCreateDialog } from "@/features/documents/components/tree-create-dialog";
import { DocumentInlineCommentTrigger } from "@/features/documents/components/comments/document-inline-comment-trigger";
import { DocumentCommentComposer } from "@/features/documents/components/comments/document-comment-composer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EditorSubmitDialog } from "@/features/documents/components/editor/editor-submit-dialog";
import { EditorReviewPanel } from "@/features/documents/components/editor/editor-review-panel";
import { EditorReviewFeedback } from "@/features/documents/components/editor/editor-review-feedback";
import { EditorSubmissionHistory } from "@/features/documents/components/editor/editor-submission-history";
import { TableInsertDialog } from "@/features/documents/components/editor/table-insert-dialog";
import {
  MOCK_SUBMISSION_HISTORY,
  type SubmissionRecord,
} from "@/lib/mock-academic";
import type { CommentNode } from "@/lib/mock-comments";
import {
  buildDocumentSeed,
  clearPendingDoc,
  readPendingDoc,
  stashPendingDoc,
} from "@/api/adapters/templates";
import { resolveDocumentParam, resolveWorkspaceParam } from "@/lib/route-params";
import { useCurrentAccount } from "@/lib/auth-session";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";
import {
  CreateTaskDialog,
  type SourceDocumentLink,
} from "@/features/tasks/components/create-task-dialog";
import {
  STATUS_LABELS,
  type TaskAssignee,
  type TaskDetail,
  type TaskPriority,
  type TaskStatus,
} from "@/api/adapters/tasks";
type SidebarTab = "outline" | "readiness" | "properties" | "comments";

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
  const fallback = scroller.querySelector("[data-thread-id]") as HTMLElement | null;
  const matching = Array.from(scroller.querySelectorAll<HTMLElement>("[data-thread-id]")).find(
    (node) => node.textContent?.includes(snippet),
  );
  return matching ?? fallback;
}

function flashAnchorTarget(target: HTMLElement): void {
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("is-flashing");
  window.setTimeout(() => target.classList.remove("is-flashing"), 1800);
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
  <div className="app-light flex h-screen bg-stone-50">
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
  }, [workspaceId]);

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
        } catch {
          if (!cancelled) setState({ status: "error", doc: null, workspace: null });
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
  }, [workspaceId, documentId, retryNonce, effectiveUserId, account?.fullName]);

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
  // Per-document submission history (mock-seeded, locally-mutable).
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionRecord[]>([]);
  useEffect(() => {
    setSubmissionHistory(MOCK_SUBMISSION_HISTORY[documentId] ?? []);
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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (mergedDoc) {
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedDoc?.id, mergedDoc?.content]);

  const editorScrollRef = useRef<HTMLDivElement>(null);
  const writingColumnRef = useRef<HTMLDivElement>(null);

  const collab = useCollaborativeDocumentEditor({
    workspaceId: isDatabaseWorkspaceId(workspaceId) ? workspaceId : "",
    documentId: documentId && isDatabaseWorkspaceId(documentId) ? documentId : "",
    user: {
      id: effectiveUserId,
      fullName: account?.fullName ?? "You",
      avatarUrl: account?.avatarUrl ?? null,
    },
    readOnly: !isEditable,
    properties: { ...properties, title: mergedDoc?.title },
    pointerRootRef: writingColumnRef,
  });
  const editor = collab.editor;

  // ─────── Outline + readiness (right rail data) ───────
  const outline = useDocumentOutline(editor);
  const templateContract = useMemo(
    () => getTemplateContract(mergedDoc?.templateId),
    [mergedDoc?.templateId],
  );
  const readiness = useDocumentReadiness(editor, templateContract);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      setSaveStatus("unsaved");
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  // Focus mode + comments rail + mobile drawers
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem("collab-editor-focus") === "true";
  });
  const defaultSidebarTab: Exclude<SidebarTab, "comments"> =
    templateContract?.enforcement === "sections-required" ? "readiness" : "outline";
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(defaultSidebarTab);
  const [previousSidebarTab, setPreviousSidebarTab] = useState<Exclude<SidebarTab, "comments">>(defaultSidebarTab);
  const [treeOpen, setTreeOpen] = useState(() => {
    const saved = localStorage.getItem("collab-editor-tree");
    return saved === null ? true : saved === "true";
  });

  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [contextRailCollapsed, setContextRailCollapsed] = useState(false);
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

  const commentsOpen = sidebarTab === "comments";

  useEffect(() => {
    localStorage.setItem("collab-editor-comments", String(commentsOpen));
  }, [commentsOpen]);

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

  // Floating composer state for inline anchored comments
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  // Pending "create task from selection" snippet
  const [pendingTaskSnippet, setPendingTaskSnippet] = useState<string | null>(null);

  const connectionStatus = useMemo((): ConnectionStatus => {
    if (collab.status === "synced" || collab.status === "connected") {
      return "connected";
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
    if (!account) return [];
    const self: PresenceUser = {
      id: effectiveUserId,
      fullName: account.fullName,
      color: AVATAR_COLORS[0],
      profileHref: "/settings/profile",
      roleLabel: "You",
      statusLabel: "Editing now",
    };
    return [self, ...collab.onlineUsers];
  }, [account, effectiveUserId, collab.onlineUsers]);

  const handleAnchorClick = (threadId: string) => {
    focusThread(threadId);
    setContextRailCollapsed(false);
    if (isBelowLg) {
      setMobileCommentsOpen(true);
    }
    setSidebarTab("comments");
  };

  const handleToggleContextRail = () => {
    const next = toggleContextRailPanel(isBelowLg, {
      contextRailCollapsed,
      mobileCommentsOpen,
    });
    setContextRailCollapsed(next.contextRailCollapsed);
    setMobileCommentsOpen(next.mobileCommentsOpen);
  };

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

  // Decorate the editor with anchor highlights for each open thread
  useAnchorDecorations({
    editor,
    threads: allThreads,
    activeThreadId,
    flashThreadId: flashAnchorId,
    onAnchorClick: handleAnchorClick,
  });

  // Jump to anchor: scroll the matching decoration into view + flash it
  const handleJumpToAnchor = (threadId: string) => {
    const scroller = editorScrollRef.current;
    if (!scroller) return;
    const el = scroller.querySelector(`[data-thread-id="${threadId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      flashAnchor(threadId);
      focusThread(threadId);
    } else {
      toast.info("Anchor text not found", {
        description: "The original text may have been edited.",
      });
    }
  };

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
              ? "Side panels hidden. Press ⌘⇧E to exit."
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

  const handleSidebarTabChange = (nextTab: SidebarTab) => {
    setSidebarTab((currentTab) => {
      if (nextTab !== "comments" && currentTab === "comments") {
        setPreviousSidebarTab(nextTab);
      }
      if (nextTab === "comments" && currentTab !== "comments") {
        setPreviousSidebarTab(currentTab);
      }
      return nextTab;
    });
  };

  if (state.status === "loading") return <EditorShellSkeleton />;

  if (state.status === "error" || !mergedDoc || !workspace) {
    return (
      <div className="app-light flex h-screen bg-stone-50">
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

  const treePanel = (
    <DocumentTreePanel
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      workspaceType={workspace.type}
      tree={documentTree}
      activeDocumentId={mergedDoc.id}
      permissions={treePermissions}
      onServerTreeChange={() => reloadDocumentTree()}
      onNavigate={handleTreeNavigate}
    />
  );

  const handleStartAnchoredComment = (snippet: string) => {
    setPendingAnchor(snippet);
  };

  const handleSubmitAnchoredComment = (body: CommentNode[]) => {
    if (pendingAnchor === null) return;
    createThread({ body, anchorSnippet: pendingAnchor });
    setPendingAnchor(null);
    if (!commentsOpen) {
      setContextRailCollapsed(false);
      if (isBelowLg) {
        setMobileCommentsOpen(true);
      }
      setSidebarTab("comments");
    }
  };

  const handleCreateTaskFromSelection = (task: TaskDetail) => {
    setPendingTaskSnippet(null);
    toast.success("Task created from document", {
      description: `"${task.title}" added to ${STATUS_LABELS[task.status]}.`,
      action: {
        label: "View board",
        onClick: () => navigate(`/w/${workspaceId}/tasks`),
      },
    });
  };

  const handleCreateGeneralComment = (body: CommentNode[]) => {
    createThread({ body });
    toast.success("Comment posted");
  };

  const handleReply = (threadId: string, body: CommentNode[]) => {
    replyToThread(threadId, body);
  };

  const handleToggleResolve = (threadId: string) => {
    const thread = allThreads.find((t) => t.id === threadId);
    toggleResolve(threadId);
    if (thread) {
      toast.success(thread.resolved ? "Thread reopened" : "Thread resolved");
    }
  };

  // Comment composer permissions: viewers/archived workspaces can read but not write
  const canComment =
    workspace.status === "active" &&
    workspace.myRole !== "VIEWER" &&
    readOnlyReason !== "archived";
  const canResolveThreads =
    workspace.myRole === "OWNER" ||
    workspace.myRole === "ADMIN" ||
    workspace.myRole === "MANAGER";

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
    const newRecord: SubmissionRecord = {
      id: `sub-${Date.now()}`,
      documentId: mergedDoc.id,
      submittedById: effectiveUserId,
      submittedByName: account?.fullName ?? "You",
      submittedAt: new Date().toISOString(),
      submissionNote: note,
      versionLabel: nextVersionLabel(),
    };
    setSubmissionHistory((prev) => [newRecord, ...prev]);
    setOverrides((prev) => ({ ...prev, status: "submitted" }));
    setSubmitDialogOpen(false);
    toast.success(isResubmission ? "Resubmitted for review" : "Submitted for review", {
      description: "Your supervisor has been notified.",
    });
  };

  const handleApprove = (note: string | undefined) => {
    if (!pendingSubmission) return;
    const decided: SubmissionRecord = {
      ...pendingSubmission,
      decision: "approved",
      decidedById: effectiveUserId,
      decidedByName: account?.fullName ?? "You",
      decidedAt: new Date().toISOString(),
      decisionNote: note,
    };
    setSubmissionHistory((prev) => [decided, ...prev.slice(1)]);
    setOverrides((prev) => ({ ...prev, status: "approved" }));
    toast.success("Document approved", {
      description: "The author has been notified.",
    });
  };

  const handleRequestChanges = (note: string) => {
    if (!pendingSubmission) return;
    const decided: SubmissionRecord = {
      ...pendingSubmission,
      decision: "changes_requested",
      decidedById: effectiveUserId,
      decidedByName: account?.fullName ?? "You",
      decidedAt: new Date().toISOString(),
      decisionNote: note,
    };
    setSubmissionHistory((prev) => [decided, ...prev.slice(1)]);
    setOverrides((prev) => ({ ...prev, status: "changes_requested" }));
    toast.success("Changes requested", {
      description: "The author can now revise and resubmit.",
    });
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


  return (
    <div className="app-light flex h-screen bg-stone-50 overflow-hidden">
      {/* Desktop tree (hidden in focus mode or if manually closed) */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-300 ease-out overflow-hidden",
          focusMode || !treeOpen ? "w-0" : "w-[280px]",
        )}
        aria-hidden={focusMode || !treeOpen}
      >
        <div className="w-[280px] h-full">{treePanel}</div>
      </div>

      {/* Mobile/tablet tree drawer (below lg) */}
      {isBelowLg && (
        <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
          <SheetContent side="left" className="p-0 w-[300px] sm:w-[320px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Documents</SheetTitle>
            </SheetHeader>
            <div className="h-full">{treePanel}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* Center editor */}
      <main className="flex-1 min-w-0 flex flex-col bg-white">
        <EditorHeader
          workspaceId={workspaceId}
          document={mergedDoc}
          presence={headerPresence}
          canLock={canLock}
          canDelete={canDelete}
          onToggleLock={handleToggleLock}
          onDelete={handleDelete}
          onToggleTree={() => {
            const next = toggleDocumentTreePanel(isBelowLg, { treeOpen, mobileTreeOpen });
            setTreeOpen(next.treeOpen);
            setMobileTreeOpen(next.mobileTreeOpen);
            if (!isBelowLg && focusMode) {
              setFocusMode(false);
            }
          }}
          treeOpen={isDocumentTreeVisible(isBelowLg, { treeOpen, mobileTreeOpen })}
          onToggleFocusMode={() => setFocusMode((f) => !f)}
          focusMode={focusMode}
          onToggleContextRail={handleToggleContextRail}
          contextRailOpen={isContextRailVisible(isBelowLg, {
            contextRailCollapsed,
            mobileCommentsOpen,
          })}
          submitSlot={submitButton}
        />
        {/* Supervisor review panel — top priority when present */}
        {showReviewPanel && pendingSubmission && (
          <EditorReviewPanel
            pendingSubmission={pendingSubmission}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        )}
        {/* Student feedback banner for changes_requested */}
        {showFeedbackBanner && lastChangesRequested && (
          <EditorReviewFeedback
            lastDecision={lastChangesRequested}
            canResubmit={canSubmitForReview}
            onResubmit={() => setSubmitDialogOpen(true)}
          />
        )}
        {/* Other read-only reasons (locked / approved / archived / viewer) — hide if review panel already explains it */}
        {readOnlyReason && !showReviewPanel && !showFeedbackBanner && (
          <EditorReadOnlyBanner
            reason={readOnlyReason}
            lockedByName={mergedDoc.lockedBy?.fullName}
          />
        )}
        {/* Submission history rail */}
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
        <EditorToolbar
          editor={editor}
          isReadOnly={
            !isEditable || connectionStatus === "connecting" || collab.status === "connected"
          }
          onInsertTableRequest={() => setTableDialogOpen(true)}
        />
        <EditorContentArea ref={editorScrollRef} writingColumnRef={writingColumnRef} editor={editor}>
          {collab.status === "synced" && (
            <RemotePointerOverlay clients={collab.awarenessSnapshot} />
          )}
        </EditorContentArea>
        {collab.provider && (
          <CollabCaretDebug status={collab.status} clients={collab.awarenessSnapshot} />
        )}
        {isEditable && (
          <EditorSlashCommand 
            editor={editor} 
            onInsertTableRequest={() => setTableDialogOpen(true)}
          />
        )}
        <EditorStatusBar
          editor={editor}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          connectionStatus={connectionStatus}
          collaboratorCount={headerPresence.length}
        />
      </main>

      {/* Right-side context rail: Outline + Readiness.
          Hidden in focus mode and on viewports below lg. The comments rail
          (xl+) sits to the right of this when both are visible. */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-300 ease-out overflow-hidden bg-background",
          focusMode || contextRailCollapsed ? "w-0" : undefined,
        )}
        aria-hidden={focusMode || contextRailCollapsed}
        style={{ width: focusMode || contextRailCollapsed ? 0 : `${contextRailWidth}px` }}
      >
        <div className="relative h-full w-full">
          {!focusMode && !contextRailCollapsed && (
            <div className="absolute left-0 inset-y-0 z-20 w-3 -translate-x-1/2 flex items-center justify-center">
              <Separator orientation="vertical" className="absolute inset-y-2 left-1/2 -translate-x-1/2 bg-transparent dark:bg-transparent" />
              <button
                type="button"
                onPointerDown={handleContextRailResizeStart}
                aria-label="Resize context rail"
                title="Resize context rail"
                className="relative h-full w-full cursor-col-resize rounded-full bg-transparent hover:bg-teal-500/10 transition-colors"
              />
            </div>
          )}
          <EditorContextRail
            editor={editor}
            outline={outline}
            contract={templateContract}
            readiness={readiness}
            properties={properties}
            onUpdateProperties={handleUpdateProperties}
            tab={sidebarTab}
            onTabChange={handleSidebarTabChange}
            commentData={{
              threads: visibleThreads,
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
            }}
          />
        </div>
      </div>

      {/* Floating selection-based comment trigger */}
      <DocumentInlineCommentTrigger
        editor={editor}
        enabled={!!editor && !pendingAnchor && !pendingTaskSnippet}
        onComment={handleStartAnchoredComment}
        onCreateTask={
          canComment ? (snippet) => setPendingTaskSnippet(snippet) : undefined
        }
      />

      {/* Mobile/tablet context drawer (right side) */}
      <Sheet open={mobileCommentsOpen} onOpenChange={setMobileCommentsOpen}>
        <SheetContent side="right" className="p-0 w-[340px] sm:w-[400px] xl:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>
          <div className="h-full">
            <EditorContextRail
              editor={editor}
              outline={outline}
              contract={templateContract}
              readiness={readiness}
              properties={properties}
              onUpdateProperties={handleUpdateProperties}
              tab={sidebarTab}
              onTabChange={handleSidebarTabChange}
              commentData={{
                threads: visibleThreads,
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
                onJumpToAnchor: (id) => {
                  handleJumpToAnchor(id);
                  setMobileCommentsOpen(false);
                },
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Anchored comment dialog: prompts the user to confirm + write the thread */}
      <Dialog open={pendingAnchor !== null} onOpenChange={(o) => !o && setPendingAnchor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Comment on selection</DialogTitle>
          </DialogHeader>
          {pendingAnchor && (
            <>
              <div className="px-3 py-2 rounded-md bg-stone-50 border-l-2 border-teal-400 text-[13px] text-stone-700 leading-snug max-h-32 overflow-y-auto">
                <span className="opacity-60">"</span>
                {pendingAnchor}
                <span className="opacity-60">"</span>
              </div>
              <DocumentCommentComposer
                placeholder="Add your comment… use @ to mention"
                submitLabel="Add comment"
                autoFocus
                members={workspaceMembers}
                onSubmit={handleSubmitAnchoredComment}
                onCancel={() => setPendingAnchor(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default DocumentEditorPage;
