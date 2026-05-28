import { useState } from "react";
import { CheckCircle2, MessageSquareWarning, Send, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { relativeTime, fullDateTime, getInitials, getAvatarColor } from "@/lib/format";
import type { SubmissionRecord } from "@/lib/mock-academic";

interface EditorReviewPanelProps {
  /** The current pending submission (no decision yet). */
  pendingSubmission: SubmissionRecord;
  onApprove: (note: string | undefined) => void;
  onRequestChanges: (note: string) => void;
}

/**
 * Supervisor-facing review surface. Mounted at the top of the editor when
 * the current document is `submitted` and the viewer can review.
 *
 * High-trust framing: dual decision controls, request-changes requires a note,
 * approve has an optional note. Submitter context is always visible.
 */
export const EditorReviewPanel = ({
  pendingSubmission,
  onApprove,
  onRequestChanges,
}: EditorReviewPanelProps) => {
  const [decision, setDecision] = useState<"approve" | "changes" | null>(null);
  const [note, setNote] = useState("");

  const noteRequired = decision === "changes";
  const canSubmit =
    decision === "approve" ||
    (decision === "changes" && note.trim().length >= 4);

  const handleConfirm = () => {
    if (!canSubmit) return;
    if (decision === "approve") onApprove(note.trim() || undefined);
    else if (decision === "changes") onRequestChanges(note.trim());
    setDecision(null);
    setNote("");
  };

  return (
    <section
      role="region"
      aria-label="Supervisor review"
      className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-3"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
            <MessageSquareWarning className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] text-amber-700 tracking-[0.18em] uppercase font-semibold">
              Review queue
            </p>
            <h2 className="text-[13px] font-semibold text-stone-900 leading-snug">
              Decision required
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600">
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-4 w-4 rounded-full text-[8px] font-semibold text-white inline-flex items-center justify-center"
                  style={{ backgroundColor: getAvatarColor(pendingSubmission.submittedById) }}
                  aria-hidden="true"
                >
                  {getInitials(pendingSubmission.submittedByName, 1)}
                </span>
                <span className="font-medium text-stone-800">{pendingSubmission.submittedByName}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-stone-500">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <time dateTime={pendingSubmission.submittedAt} title={fullDateTime(pendingSubmission.submittedAt)}>
                  {relativeTime(pendingSubmission.submittedAt)}
                </time>
              </span>
              {pendingSubmission.versionLabel && (
                <span className="font-mono text-[9px] tracking-wider uppercase text-stone-500 px-1.5 py-0.5 rounded bg-white border border-stone-200">
                  {pendingSubmission.versionLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {pendingSubmission.submissionNote && (
          <blockquote className="border-l-2 border-amber-300 pl-2.5 text-[12px] text-stone-700 leading-relaxed bg-white/70 py-2 rounded-r">
            <span className="font-mono text-[9px] text-stone-400 tracking-[0.16em] uppercase block mb-0.5">
              Submitter note
            </span>
            {pendingSubmission.submissionNote}
          </blockquote>
        )}

        {decision === null ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision("approve")}
              className="h-9 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision("changes")}
              className="h-9 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Request changes
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-stone-800 inline-flex items-center gap-1.5">
                {decision === "approve" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Approve this document
                  </>
                ) : (
                  <>
                    <MessageSquareWarning className="h-3.5 w-3.5 text-amber-600" />
                    Request changes
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDecision(null);
                  setNote("");
                }}
                className="text-[10px] text-stone-500 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div>
              <label
                htmlFor="review-note"
                className="font-mono text-[9px] text-stone-500 tracking-[0.14em] uppercase"
              >
                {noteRequired ? (
                  <>
                    Feedback{" "}
                    <span className="text-red-600 normal-case tracking-normal font-sans">
                      *required
                    </span>
                  </>
                ) : (
                  <>
                    Note{" "}
                    <span className="text-stone-400 normal-case tracking-normal font-sans">
                      (optional)
                    </span>
                  </>
                )}
              </label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  noteRequired
                    ? "Tell the author what needs to change…"
                    : "Anything the author should know?"
                }
                autoFocus
                className="mt-1 text-[12px] resize-none"
              />
              {noteRequired && note.trim().length > 0 && note.trim().length < 4 && (
                <p className="text-[11px] text-red-600 mt-1">
                  Add a few words of context.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleConfirm}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-sm",
                  decision === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed",
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {decision === "approve" ? "Approve document" : "Send feedback"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
