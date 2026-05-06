/**
 * EditorContextRail
 *
 * Right-side context rail for the document editor, with two tabs:
 *   - Outline   → headings TOC (always available)
 *   - Readiness → template-contract progress (only when a contract exists)
 *
 * The rail is the third pane of the editor's three-pane shell:
 *   [doc tree] [writing canvas] [context rail]
 *
 * It is hidden in focus mode and on viewports below xl (1280px) — at
 * those sizes the user can still open Outline via the header (TODO:
 * mobile-only outline drawer in a follow-up).
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DocumentOutlineRail } from "./editor-outline-rail";
import { DocumentReadinessPanel } from "./editor-readiness-panel";
import {
  scrollToOutlineNode,
  type OutlineNode,
} from "@/features/documents/hooks/use-document-outline";
import type {
  DocumentReadiness,
  TemplateContract,
} from "@/features/documents/template-schema";

interface EditorContextRailProps {
  editor: Editor | null;
  outline: OutlineNode[];
  contract: TemplateContract | null;
  readiness: DocumentReadiness | null;
}

export const EditorContextRail = ({
  editor,
  outline,
  contract,
  readiness,
}: EditorContextRailProps) => {
  const hasContract = contract !== null && readiness !== null;
  const [tab, setTab] = useState<"outline" | "readiness">(
    hasContract ? "readiness" : "outline",
  );

  const handleJump = (node: OutlineNode) => {
    if (!editor) return;
    scrollToOutlineNode(editor, node.pos);
  };

  return (
    <aside
      aria-label="Document context"
      className="h-full bg-white border-l border-stone-200 flex flex-col overflow-hidden"
    >
      {hasContract ? (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-2 mx-3 mt-3 mb-0 h-8 bg-stone-100">
            <TabsTrigger value="readiness" className="text-[12px]">
              Readiness
              {readiness && readiness.total > 0 && (
                <span className="ml-1.5 text-[10px] font-mono text-stone-500">
                  {readiness.completed}/{readiness.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outline" className="text-[12px]">
              Outline
              {outline.length > 0 && (
                <span className="ml-1.5 text-[10px] font-mono text-stone-500">
                  {outline.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="readiness"
            className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden"
          >
            <DocumentReadinessPanel
              editor={editor}
              contract={contract!}
              readiness={readiness!}
            />
          </TabsContent>
          <TabsContent
            value="outline"
            className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden"
          >
            <DocumentOutlineRail outline={outline} onJump={handleJump} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <header className="px-4 pt-4 pb-2 border-b border-stone-200">
            <h3 className="text-[13px] font-semibold text-stone-900">
              Outline
            </h3>
            <p className="text-[11px] text-stone-500">
              Live table of contents
            </p>
          </header>
          <div className="flex-1 overflow-y-auto">
            <DocumentOutlineRail outline={outline} onJump={handleJump} />
          </div>
        </>
      )}
    </aside>
  );
};
