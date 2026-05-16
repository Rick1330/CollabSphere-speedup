import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Eye,
  FileText,
  Layers,
  LayoutTemplate,
  Loader2,
  ArrowRight,
  Clock as ClockIcon,
} from "lucide-react";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplate,
} from "@/api/adapters/templates";
import { documentTemplateCategoriesForWorkspace } from "@/lib/document-template-api-map";
import { workspaceStore } from "@/features/workspace/store/workspace-store";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Templates = () => {
  const params = useParams<{ workspaceId: string }>();
  const paramWorkspaceId = params.workspaceId?.trim() ?? "";
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, myRole, isLoading, isError, accessDenied, refetch } =
    useWorkspaceRouteContext();

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  const workspace = sidebar;

  const [query, setQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentTemplate | null>(null);

  const allowedDocCategories = useMemo(
    () => (workspace ? documentTemplateCategoriesForWorkspace(workspace.type) : null),
    [workspace],
  );

  const docFiltered = useMemo(() => {
    if (!allowedDocCategories) return [];
    const q = query.trim().toLowerCase();
    return DOCUMENT_TEMPLATES.filter((t) => allowedDocCategories.has(t.category)).filter(
      (t) =>
        q.length === 0 ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.includes(q),
    );
  }, [query, allowedDocCategories]);

  useEffect(() => {
    if (!accessDenied || !workspaceId) return;
    if (workspaceStore.getById({ workspaceId })) {
      workspaceStore.remove({ workspaceId });
    }
    toast.error("You are not a member of this workspace.", {
      description: "Accept an invitation first, or open a workspace you belong to.",
    });
    navigate("/workspaces", { replace: true });
  }, [accessDenied, navigate, workspaceId]);

  useEffect(() => {
    if (workspace?.name) {
      document.title = `Templates — ${workspace.name} — CollabSphere`;
    }
  }, [workspace?.name]);

  if (!paramWorkspaceId) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center text-stone-500 text-sm">
        Missing workspace in URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center gap-2 text-stone-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (isError || !workspace || !myRole) {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">
          {accessDenied ? "You do not have access to this workspace." : "Couldn’t load templates for this workspace."}
        </p>
        {!accessDenied && (
          <button
            type="button"
            onClick={() => refetch()}
            className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate("/workspaces")}
          className="h-10 px-4 rounded-lg border border-stone-200 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50"
        >
          My workspaces
        </button>
      </div>
    );
  }

  const loading = false;

  return (
    <div className="app-light min-h-screen flex">
      <WorkspaceSidebar workspace={workspace} collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />

        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto w-full">
          <PageHeader
            variant="contextual"
            eyebrow="Library"
            title="Document templates"
            description={`Starter layouts for new documents in this ${workspace.type} workspace. Full workspace layouts are chosen when you create a workspace.`}
            icon={<LayoutTemplate className="h-5 w-5 text-stone-700" />}
          />

          <div className="mt-8 flex flex-col sm:flex-row sm:items-end justify-end gap-4">
            <div className="relative w-full sm:w-72 sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search document templates"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-9 rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200/50"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                  aria-label="Clear"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <section className="mt-6">
            {loading ? (
              <CardGridSkeleton />
            ) : docFiltered.length === 0 ? (
              <EmptyState query={query} kind="document templates" />
            ) : (
              <DocumentTemplateList
                templates={docFiltered}
                onPreview={(t) => setPreviewDoc(t)}
                workspaceId={workspaceId}
                onUse={(t) => navigate(`/w/${workspaceId}/documents/new?template=${t.id}`)}
              />
            )}
          </section>
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />

      <DocumentTemplatePreview
        template={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onUse={(t) => {
          setPreviewDoc(null);
          navigate(`/w/${workspaceId}/documents/new?template=${t.id}`);
        }}
      />
    </div>
  );
};

const DOC_CAT_LABEL: Record<DocumentTemplate["category"], string> = {
  meeting: "Meeting",
  planning: "Planning",
  research: "Research",
  writing: "Writing",
  engineering: "Engineering",
};

const DOC_CAT_TONE: Record<
  DocumentTemplate["category"],
  { chip: string; iconBg: string; iconColor: string; ring: string }
> = {
  meeting: {
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconBg: "bg-sky-50 border-sky-200",
    iconColor: "text-sky-600",
    ring: "group-hover:border-sky-300",
  },
  planning: {
    chip: "bg-teal-50 text-teal-700 border-teal-200",
    iconBg: "bg-teal-50 border-teal-200",
    iconColor: "text-teal-600",
    ring: "group-hover:border-teal-300",
  },
  research: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    ring: "group-hover:border-amber-300",
  },
  writing: {
    chip: "bg-stone-100 text-stone-700 border-stone-200",
    iconBg: "bg-stone-50 border-stone-200",
    iconColor: "text-stone-600",
    ring: "group-hover:border-stone-300",
  },
  engineering: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-600",
    ring: "group-hover:border-emerald-300",
  },
};

const DocumentTemplateList = ({
  templates,
  onPreview,
  onUse,
}: {
  templates: DocumentTemplate[];
  onPreview: (t: DocumentTemplate) => void;
  workspaceId: string;
  onUse: (t: DocumentTemplate) => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {templates.map((t) => {
      const tone = DOC_CAT_TONE[t.category];
      const sectionCount = t.preview.sections.length;
      return (
        <article
          key={t.id}
          className={cn(
            "group relative rounded-xl border border-stone-200 bg-white p-5 hover:shadow-md transition-all duration-150 flex flex-col overflow-hidden",
            tone.ring,
          )}
        >
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-lg border flex items-center justify-center flex-shrink-0",
                tone.iconBg,
              )}
            >
              <FileText className={cn("h-4 w-4", tone.iconColor)} />
            </div>
            <span
              className={cn(
                "text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full border",
                tone.chip,
              )}
            >
              {DOC_CAT_LABEL[t.category]}
            </span>
          </div>

          <h4 className="text-[15px] font-semibold text-stone-900 tracking-tight mt-4 leading-snug">
            {t.name}
          </h4>
          <p className="text-[13px] text-stone-600 mt-1.5 leading-relaxed line-clamp-2 flex-1">
            {t.description}
          </p>

          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {sectionCount} section{sectionCount === 1 ? "" : "s"}
            </span>
            {t.estReadMin > 0 && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                ~{t.estReadMin} min
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(t)}
              className="h-8 px-3 rounded-md border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors inline-flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => onUse(t)}
              className="h-8 px-3 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[12px] font-semibold transition-colors inline-flex items-center gap-1.5 flex-1 justify-center"
            >
              Use template
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>
      );
    })}
  </div>
);

/* ─────────── States ─────────── */

const CardGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="h-9 w-9 rounded-lg bg-stone-100 animate-pulse" />
        <div className="h-5 w-3/5 rounded bg-stone-100 animate-pulse mt-4" />
        <div className="h-3 w-2/5 rounded bg-stone-100 animate-pulse mt-2" />
        <div className="h-3 w-full rounded bg-stone-100 animate-pulse mt-4" />
        <div className="h-3 w-4/5 rounded bg-stone-100 animate-pulse mt-2" />
        <div className="h-8 w-full rounded bg-stone-100 animate-pulse mt-6" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ query, kind }: { query: string; kind: string }) => (
  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center relative overflow-hidden">
    <div
      aria-hidden
      className="absolute inset-0 bg-gradient-to-b from-stone-50/50 to-transparent pointer-events-none"
    />
    <div className="relative">
      <div className="h-12 w-12 rounded-xl bg-stone-100 border border-stone-200 mx-auto flex items-center justify-center mb-4">
        <Search className="h-5 w-5 text-stone-400" />
      </div>
      <p className="text-[15px] font-semibold text-stone-900">
        {query ? `No ${kind} match "${query}"` : `No ${kind} yet`}
      </p>
      <p className="text-[13px] text-stone-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
        {query
          ? "Try a shorter search or clear filters to see everything available."
          : "New templates show up here as they ship."}
      </p>
    </div>
  </div>
);

const DocumentTemplatePreview = ({
  template,
  onClose,
  onUse,
}: {
  template: DocumentTemplate | null;
  onClose: () => void;
  onUse: (t: DocumentTemplate) => void;
}) => {
  const open = !!template;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        {template && (
          <>
            <DialogHeader>
              <span className="font-mono text-[10px] text-stone-400 tracking-[0.22em] uppercase">
                Document template
              </span>
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-4">
              <div className="font-mono text-[10px] text-stone-500 tracking-[0.18em] uppercase mb-2">
                Section outline
              </div>
              <ol className="text-[13px] text-stone-800 space-y-1.5 list-decimal list-inside">
                {template.preview.sections.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-md border border-stone-200 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onUse(template)}
                className="h-9 px-4 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[13px] font-medium inline-flex items-center gap-2"
              >
                Use this template
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Templates;
