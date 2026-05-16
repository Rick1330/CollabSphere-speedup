import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  FilePlus,
  FolderPlus,
  LayoutTemplate,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENT_TEMPLATES } from "@/api/adapters/templates";
import { documentTemplateCategoriesForWorkspace } from "@/lib/document-template-api-map";
import type { WorkspaceForSidebar } from "@/features/workspace/components/workspace-sidebar";
import { cn } from "@/lib/utils";

interface BaseProps {
  open: boolean;
  onClose: () => void;
}

interface DocDialogProps extends BaseProps {
  kind: "document";
  /** Limits template picks to categories compatible with this workspace type. */
  workspaceType: WorkspaceForSidebar["type"];
  folderName: string | null;
  /** When set, dialog acts as rename (no template picker). */
  defaultName?: string;
  /**
   * Called when the user confirms creation. `templateId` is always provided —
   * `"doc-blank"` for a blank document, otherwise the picked document template.
   */
  onCreated: (title: string, templateId: string) => void | Promise<void>;
}

interface FolderDialogProps extends BaseProps {
  kind: "folder";
  parentName: string | null;
  defaultName?: string;
  onCreated: (name: string) => void | Promise<void>;
}

// Six picks — keeps the dialog compact; filtered by workspace type at runtime.
const TEMPLATE_PICK_SOURCE = DOCUMENT_TEMPLATES.slice(0, 12);

export const TreeCreateDialog = (props: DocDialogProps | FolderDialogProps) => {
  const [value, setValue] = useState("");
  const [templateId, setTemplateId] = useState<string>("doc-blank");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDoc = props.kind === "document";
  const isRenameDoc = isDoc && props.kind === "document" && Boolean(props.defaultName);
  const workspaceType = isDoc ? props.workspaceType : "general";

  const templatePicks = useMemo(() => {
    if (!isDoc) return [];
    const allowed = documentTemplateCategoriesForWorkspace(workspaceType);
    return TEMPLATE_PICK_SOURCE.filter((t) => allowed.has(t.category)).slice(0, 6);
  }, [isDoc, workspaceType]);

  useEffect(() => {
    if (!isDoc || !props.open) return;
    if (!templatePicks.some((t) => t.id === templateId)) {
      setTemplateId("doc-blank");
    }
  }, [isDoc, props.open, templateId, templatePicks]);

  useEffect(() => {
    if (!props.open) return;
    if (props.kind === "folder") {
      setValue(props.defaultName ?? "");
    } else {
      setValue(props.defaultName ?? "");
    }
  }, [
    props.open,
    props.kind,
    props.kind === "folder" ? props.defaultName : props.kind === "document" ? props.defaultName : undefined,
  ]);
  const max = isDoc ? 200 : 120;
  const label = isDoc ? "Document title" : "Folder name";
  const placeholder = isDoc
    ? "e.g., Project Roadmap, Meeting Notes"
    : "e.g., Chapter 1, Architecture, Meetings";
  const title = isRenameDoc ? "Rename document" : isDoc ? "New document" : props.defaultName ? "Rename folder" : "New folder";
  const desc = isRenameDoc
    ? "Update the document title."
    : isDoc
    ? props.kind === "document" && props.folderName
      ? `Create a new document in "${props.folderName}".`
      : "Create a new document at the workspace root."
    : props.kind === "folder" && props.parentName
      ? `Create a new subfolder inside "${props.parentName}".`
      : "Create a new folder at the workspace root.";

  const handleClose = () => {
    setValue("");
    setTemplateId("doc-blank");
    setError(null);
    setSubmitting(false);
    props.onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(`${label} is required.`);
      return;
    }
    if (trimmed.length > max) {
      setError(`Must be ${max} characters or less.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (props.kind === "document") {
        await props.onCreated(trimmed, templateId);
      } else {
        await props.onCreated(trimmed);
      }
      setValue("");
      setTemplateId("doc-blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700",
          isDoc ? "max-w-lg" : "max-w-md",
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-stone-900 dark:text-stone-100">{title}</DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-stone-400">{desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label
              htmlFor="tree-create-input"
              className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5 block"
            >
              {label}
            </label>
            <input
              id="tree-create-input"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              maxLength={max + 10}
              className="w-full h-11 px-3.5 rounded-lg text-sm bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-600 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-all duration-150"
            />
            {error && (
              <p className="text-[13px] text-red-500 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </p>
            )}
          </div>

          {isDoc && !isRenameDoc && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-sm font-medium text-stone-700 dark:text-stone-200 flex items-center gap-1.5"
                  id="tree-create-template-label"
                >
                  <LayoutTemplate className="h-3.5 w-3.5 text-stone-400" />
                  Template
                </label>
                <span className="font-mono text-[10px] text-stone-400 tracking-[0.16em] uppercase">
                  Optional
                </span>
              </div>
              <ul
                role="radiogroup"
                aria-labelledby="tree-create-template-label"
                className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 -mr-1"
              >
                {templatePicks.map((t) => {
                  const active = t.id === templateId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setTemplateId(t.id)}
                        className={cn(
                          "w-full text-left rounded-lg border p-2.5 transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30",
                            active
                              ? "border-stone-900 dark:border-stone-100 bg-stone-50/70 dark:bg-stone-800 shadow-sm"
                              : "border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 hover:border-stone-300 dark:hover:border-stone-500",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "h-5 w-5 rounded flex items-center justify-center flex-shrink-0 border mt-0.5",
                                active
                                  ? "bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900"
                                  : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-600 text-transparent",
                            )}
                            aria-hidden="true"
                          >
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                              {t.name}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : isDoc ? (
                <>
                  <FilePlus className="h-3.5 w-3.5" />
                  Create document
                </>
              ) : (
                <>
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create folder
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
