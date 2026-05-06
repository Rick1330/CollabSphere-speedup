/**
 * DocumentReadinessPanel
 *
 * Renders the per-section readiness state computed by the readiness
 * engine. Three statuses per section:
 *
 *   ✓ ok          — present and meets word-count / required blocks
 *   ◐ underweight — present but missing word count or required block
 *   ✗ missing     — heading not found
 *
 * The panel header shows aggregate progress and the current enforcement
 * level. When a section has a position, clicking it jumps to that
 * heading in the editor.
 */
import { Check, AlertTriangle, X, Info, ListChecks } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  DocumentReadiness,
  SectionReadiness,
  TemplateContract,
} from "@/features/documents/template-schema";
import { scrollToOutlineNode } from "@/features/documents/hooks/use-document-outline";

interface DocumentReadinessPanelProps {
  editor: Editor | null;
  contract: TemplateContract;
  readiness: DocumentReadiness;
}

const STATUS_META: Record<
  SectionReadiness["status"],
  { Icon: typeof Check; bg: string; fg: string; label: string }
> = {
  ok: {
    Icon: Check,
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
    label: "Complete",
  },
  underweight: {
    Icon: AlertTriangle,
    bg: "bg-amber-50",
    fg: "text-amber-600",
    label: "Needs more",
  },
  missing: {
    Icon: X,
    bg: "bg-stone-100",
    fg: "text-stone-400",
    label: "Missing",
  },
};

const ENFORCEMENT_LABEL: Record<TemplateContract["enforcement"], string> = {
  advisory: "Advisory",
  "sections-required": "Sections required",
  strict: "Strict",
};

export const DocumentReadinessPanel = ({
  editor,
  contract,
  readiness,
}: DocumentReadinessPanelProps) => {
  const percent = Math.round(readiness.progress * 100);

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-4 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="h-4 w-4 text-teal-600" aria-hidden="true" />
          <h3 className="text-[13px] font-semibold text-stone-900">
            Readiness · {contract.templateName}
          </h3>
        </div>
        <p className="text-[11px] text-stone-500 mb-2">
          {ENFORCEMENT_LABEL[contract.enforcement]} ·{" "}
          {readiness.completed}/{readiness.total} items
        </p>
        <Progress
          value={percent}
          className="h-1.5 bg-stone-100 [&>div]:bg-teal-500"
          aria-label={`Document readiness ${percent}%`}
        />
        {readiness.blockingReason && readiness.blocksSubmit && (
          <div className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-700">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="leading-snug">{readiness.blockingReason}</span>
          </div>
        )}
        {readiness.isReady && (
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Document satisfies the template contract.</span>
          </div>
        )}
      </header>

      <ul className="flex-1 overflow-y-auto py-1">
        {readiness.sections.map((s) => {
          const meta = STATUS_META[s.status];
          const Icon = meta.Icon;
          const canJump = s.pos !== null;
          const inner = (
            <>
              <span
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0",
                  meta.bg,
                )}
                aria-hidden="true"
              >
                <Icon className={cn("h-3 w-3", meta.fg)} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 justify-between">
                  <span
                    className={cn(
                      "text-[13px] font-medium truncate",
                      s.status === "missing"
                        ? "text-stone-400"
                        : "text-stone-800",
                    )}
                  >
                    {s.section.headingText}
                  </span>
                  {s.section.minimumWordCount && s.status !== "missing" && (
                    <span
                      className={cn(
                        "text-[10px] font-mono flex-shrink-0",
                        s.wordCount < (s.section.minimumWordCount ?? 0)
                          ? "text-amber-600"
                          : "text-stone-400",
                      )}
                    >
                      {s.wordCount}/{s.section.minimumWordCount}w
                    </span>
                  )}
                </div>
                {s.section.hint && s.status !== "ok" && (
                  <p className="text-[11px] text-stone-500 leading-snug mt-0.5">
                    {s.section.hint}
                  </p>
                )}
                {s.missingBlocks.length > 0 && (
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Needs:{" "}
                    {s.missingBlocks.map((b) => b.label).join(", ")}
                  </p>
                )}
              </div>
            </>
          );
          return (
            <li key={s.section.id}>
              {canJump ? (
                <button
                  type="button"
                  onClick={() => editor && scrollToOutlineNode(editor, s.pos!)}
                  className="w-full flex items-start gap-2 px-4 py-2 text-left hover:bg-stone-50 transition-colors"
                >
                  {inner}
                </button>
              ) : (
                <div className="w-full flex items-start gap-2 px-4 py-2 cursor-default">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
