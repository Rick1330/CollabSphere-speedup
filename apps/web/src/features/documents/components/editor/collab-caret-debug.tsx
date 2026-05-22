import { useEffect, useState } from "react";
import type { AwarenessClientSnapshot } from "@/hooks/use-collaborative-document-editor";
import { cn } from "@/lib/utils";

type CollabCaretDebugProps = {
  status: string;
  clients: AwarenessClientSnapshot[];
};

type CaretMetrics = {
  height: string;
  borderWidth: string;
  borderColor: string;
  visibility: string;
  opacity: string;
};

function readRemoteCaretMetrics(): CaretMetrics | null {
  const el = document.querySelector(
    ".tiptap .collaboration-cursor__caret:not([data-local])",
  ) as HTMLElement | null;
  if (!el) {
    const anyCaret = document.querySelector(".tiptap .collaboration-cursor__caret") as HTMLElement | null;
    if (!anyCaret) return null;
    const s = getComputedStyle(anyCaret);
    return {
      height: s.height,
      borderWidth: s.borderLeftWidth,
      borderColor: s.borderLeftColor,
      visibility: s.visibility,
      opacity: s.opacity,
    };
  }
  const s = getComputedStyle(el);
  return {
    height: s.height,
    borderWidth: s.borderLeftWidth,
    borderColor: s.borderLeftColor,
    visibility: s.visibility,
    opacity: s.opacity,
  };
}

export function CollabCaretDebug({ status, clients }: CollabCaretDebugProps) {
  const [domCaretCount, setDomCaretCount] = useState(0);
  const [caretMetrics, setCaretMetrics] = useState<CaretMetrics | null>(null);

  useEffect(() => {
    const tick = () => {
      setDomCaretCount(document.querySelectorAll(".tiptap .collaboration-cursor__caret").length);
      setCaretMetrics(readRemoteCaretMetrics());
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [clients]);

  if (!import.meta.env.DEV) return null;

  const remoteWithCursor = clients.filter((c) => !c.isLocal && c.hasCursor).length;

  return (
    <div
      className="group fixed bottom-0 right-0 z-[100] flex flex-col items-end"
      aria-label="Collab debug hover zone"
    >
      <div
        className={cn(
          "mb-2 mr-4 max-w-sm rounded-lg border border-stone-300 bg-white/95 p-3 font-mono text-[10px] leading-snug text-stone-800 shadow-lg backdrop-blur-sm",
          "opacity-0 invisible pointer-events-none",
          "transition-[opacity,visibility] duration-150",
          "group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto",
        )}
        aria-label="Collab caret debug"
      >
        <div className="mb-2 font-semibold text-stone-900">Collab caret debug</div>
        <div>
          status: <span className="font-semibold">{status}</span>
        </div>
        <div>
          DOM carets: <span className="font-semibold">{domCaretCount}</span>
        </div>
        <div>
          remote hasCursor: <span className="font-semibold">{remoteWithCursor}</span>
        </div>
        {caretMetrics && (
          <div className="mt-1 text-stone-600">
            caret: h={caretMetrics.height} border={caretMetrics.borderWidth}{" "}
            {caretMetrics.borderColor} vis={caretMetrics.visibility} op={caretMetrics.opacity}
          </div>
        )}
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
          {clients.length === 0 ? (
            <li className="text-stone-500">no awareness clients</li>
          ) : (
            clients.map((c) => (
              <li key={c.clientId}>
                {c.isLocal ? "local" : "remote"} #{c.clientId}{" "}
                {c.userName ? `"${c.userName}"` : "(no user)"} cursor=
                {c.hasCursor ? "yes" : "no"}
                {c.hasPointer && c.pointer
                  ? ` pointer=(${c.pointer.x.toFixed(2)},${c.pointer.y.toFixed(2)})`
                  : ""}
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-stone-600">
          Text caret = colored bar in document. Mouse = Windows-style pointer overlay. Hover this
          footer corner to show or hide this panel.
        </p>
      </div>

      {/* Invisible hit target over status bar right (CONNECTED / UNSAVED) */}
      <div className="h-8 w-36 shrink-0" aria-hidden="true" />
    </div>
  );
}
