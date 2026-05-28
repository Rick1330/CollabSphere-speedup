import { MessageSquareWarning, RotateCcw, Clock } from "lucide-react";
import { relativeTime, fullDateTime, getInitials, getAvatarColor } from "@/lib/format";
import type { SubmissionRecord } from "@/lib/mock-academic";

interface EditorReviewFeedbackProps {
  /** The most recent decided submission with a `changes_requested` outcome. */
  lastDecision: SubmissionRecord;
  /** True if the viewer is the submitter and can act on the feedback. */
  canResubmit: boolean;
  onResubmit: () => void;
}

/**
 * Student-facing surface shown when a document is `changes_requested`.
 * Surfaces the supervisor's feedback prominently and offers a clear
 * resubmit path. The document is editable underneath.
 */
export const EditorReviewFeedback = ({
  lastDecision,
  canResubmit,
  onResubmit,
}: EditorReviewFeedbackProps) => {
  return (
    <section
      role="region"
      aria-label="Reviewer feedback"
      className="rounded-xl border border-red-200 bg-gradient-to-b from-red-50/70 to-white p-3"
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0">
              <MessageSquareWarning className="h-4 w-4 text-red-700" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] text-red-700 tracking-[0.16em] uppercase font-semibold">
                Changes requested
              </p>
              <h2 className="text-[13px] font-semibold text-stone-900 mt-0.5 leading-snug">
                Revise and resubmit
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-stone-600">
                {lastDecision.decidedByName && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 rounded-full text-[8px] font-semibold text-white inline-flex items-center justify-center"
                      style={{
                        backgroundColor: getAvatarColor(lastDecision.decidedById ?? ""),
                      }}
                      aria-hidden="true"
                    >
                      {getInitials(lastDecision.decidedByName, 1)}
                    </span>
                    Reviewed by{" "}
                    <span className="font-medium text-stone-800">
                      {lastDecision.decidedByName}
                    </span>
                  </span>
                )}
                {lastDecision.decidedAt && (
                  <span className="inline-flex items-center gap-1 text-stone-500">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <time
                      dateTime={lastDecision.decidedAt}
                      title={fullDateTime(lastDecision.decidedAt)}
                    >
                      {relativeTime(lastDecision.decidedAt)}
                    </time>
                  </span>
                )}
              </div>
            </div>
          </div>
          {canResubmit && (
            <button
              type="button"
              onClick={onResubmit}
              className="flex-shrink-0 h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Resubmit
            </button>
          )}
        </div>

        {lastDecision.decisionNote && (
          <blockquote className="border-l-2 border-red-400 pl-2.5 text-[12px] text-stone-800 leading-relaxed bg-white/70 py-2 rounded-r">
            <span className="font-mono text-[9px] text-stone-400 tracking-[0.16em] uppercase block mb-0.5">
              Reviewer feedback
            </span>
            {lastDecision.decisionNote}
          </blockquote>
        )}
      </div>
    </section>
  );
};
