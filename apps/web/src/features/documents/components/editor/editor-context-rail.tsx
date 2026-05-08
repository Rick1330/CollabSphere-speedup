/**
 * EditorContextRail
 *
 * Right-side context rail for the document editor, with four tabs:
 *   - Outline    → headings TOC
 *   - Readiness  → template-contract progress
 *   - Properties → document metadata/frontmatter
 *   - Comments   → threaded discussion list
 *
 * The rail is the third pane of the editor's shell:
 *   [doc tree] [writing canvas] [context rail]
 */
import type { Editor } from "@tiptap/react";
import { ScrollText, ListChecks, FileText, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DocumentOutlineRail } from "./editor-outline-rail";
import { DocumentReadinessPanel } from "./editor-readiness-panel";
import { DocumentPropertiesPanel } from "./document-properties-panel";
import { DocumentCommentsRail } from "@/features/documents/components/comments/document-comments-rail";
import {
  scrollToOutlineNode,
  type OutlineNode,
} from "@/features/documents/hooks/use-document-outline";
import type {
  DocumentReadiness,
  TemplateContract,
} from "@/features/documents/template-schema";
import type { CommentFilter } from "@/features/documents/hooks/use-document-comments";
import type { CommentNode, CommentThread } from "@/lib/mock-comments";

interface EditorContextRailProps {
  editor: Editor | null;
  outline: OutlineNode[];
  contract: TemplateContract | null;
  readiness: DocumentReadiness | null;
  properties: any;
  onUpdateProperties: (props: any) => void;
  tab: "outline" | "readiness" | "properties" | "comments";
  onTabChange: (tab: "outline" | "readiness" | "properties" | "comments") => void;
  commentData: {
    threads: CommentThread[];
    filter: CommentFilter;
    openCount: number;
    resolvedCount: number;
    activeThreadId: string | null;
    canComment: boolean;
    canResolve: boolean;
    onFilterChange: (f: CommentFilter) => void;
    onCreate: (body: CommentNode[]) => void;
    onReply: (threadId: string, body: CommentNode[]) => void;
    onToggleResolve: (threadId: string) => void;
    onSelectThread: (threadId: string | null) => void;
    onJumpToAnchor: (threadId: string) => void;
  };
}

export const EditorContextRail = ({
  editor,
  outline,
  contract,
  readiness,
  properties,
  onUpdateProperties,
  tab,
  onTabChange,
  commentData,
}: EditorContextRailProps) => {
  const hasContract = contract !== null && readiness !== null;

  const handleJump = (node: OutlineNode) => {
    if (!editor) return;
    scrollToOutlineNode(editor, node.pos);
  };

  return (
    <aside
      aria-label="Document context"
      className="flex h-full flex-col overflow-hidden border-l border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950"
    >
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as typeof tab)}
        className="flex h-full flex-col"
      >
        {/* Tab Header with Icons */}
        <TabsList className="flex h-14 items-center justify-start gap-0 rounded-none border-b border-stone-200 bg-white p-0 dark:border-stone-800 dark:bg-stone-950">
          <TabsTrigger
            value="outline"
            className={cn(
              "group relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none border-0 px-4 py-2 transition-all",
              "data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50/40 dark:data-[state=active]:border-teal-400 dark:data-[state=active]:bg-teal-950/20",
              "text-stone-600 hover:bg-stone-100/60 dark:text-stone-400 dark:hover:bg-stone-900/60"
            )}
            title="Document outline and structure"
          >
            <ScrollText className="h-4 w-4 transition-colors group-data-[state=active]:text-teal-600 dark:group-data-[state=active]:text-teal-400" />
            <span className="text-[10px] font-medium">Outline</span>
          </TabsTrigger>

          <TabsTrigger
            value="readiness"
            className={cn(
              "group relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none border-0 px-4 py-2 transition-all",
              "data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50/40 dark:data-[state=active]:border-teal-400 dark:data-[state=active]:bg-teal-950/20",
              "text-stone-600 hover:bg-stone-100/60 dark:text-stone-400 dark:hover:bg-stone-900/60"
            )}
            title="Readiness checklist"
          >
            <ListChecks className="h-4 w-4 transition-colors group-data-[state=active]:text-teal-600 dark:group-data-[state=active]:text-teal-400" />
            <span className="text-[10px] font-medium">Readiness</span>
          </TabsTrigger>

          <TabsTrigger
            value="properties"
            className={cn(
              "group relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none border-0 px-4 py-2 transition-all",
              "data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50/40 dark:data-[state=active]:border-teal-400 dark:data-[state=active]:bg-teal-950/20",
              "text-stone-600 hover:bg-stone-100/60 dark:text-stone-400 dark:hover:bg-stone-900/60"
            )}
            title="Document properties and metadata"
          >
            <FileText className="h-4 w-4 transition-colors group-data-[state=active]:text-teal-600 dark:group-data-[state=active]:text-teal-400" />
            <span className="text-[10px] font-medium">Properties</span>
          </TabsTrigger>

          <TabsTrigger
            value="comments"
            className={cn(
              "group relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none border-0 px-4 py-2 transition-all",
              "data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50/40 dark:data-[state=active]:border-teal-400 dark:data-[state=active]:bg-teal-950/20",
              "text-stone-600 hover:bg-stone-100/60 dark:text-stone-400 dark:hover:bg-stone-900/60"
            )}
            title="Comments and feedback"
          >
            <MessageSquare className="h-4 w-4 transition-colors group-data-[state=active]:text-teal-600 dark:group-data-[state=active]:text-teal-400" />
            <span className="text-[10px] font-medium">Comments</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent
            value="outline"
            className="h-full overflow-y-auto"
            asChild
          >
            <div>
              <DocumentOutlineRail outline={outline} onJump={handleJump} />
            </div>
          </TabsContent>

          <TabsContent
            value="readiness"
            className="h-full overflow-y-auto"
            asChild
          >
            <div>
              {hasContract ? (
                <DocumentReadinessPanel
                  editor={editor}
                  contract={contract!}
                  readiness={readiness!}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ListChecks className="mb-3 h-10 w-10 text-stone-300 dark:text-stone-700" />
                  <p className="text-sm text-stone-500 dark:text-stone-400">No template contract</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="properties"
            className="h-full overflow-y-auto"
            asChild
          >
            <div>
              <DocumentPropertiesPanel properties={properties} onUpdate={onUpdateProperties} />
            </div>
          </TabsContent>

          <TabsContent
            value="comments"
            className="h-full overflow-y-auto"
            asChild
          >
            <div>
              <DocumentCommentsRail
                threads={commentData.threads}
                filter={commentData.filter}
                openCount={commentData.openCount}
                resolvedCount={commentData.resolvedCount}
                activeThreadId={commentData.activeThreadId}
                canComment={commentData.canComment}
                canResolve={commentData.canResolve}
                onFilterChange={commentData.onFilterChange}
                onCreate={commentData.onCreate}
                onReply={commentData.onReply}
                onToggleResolve={commentData.onToggleResolve}
                onSelectThread={commentData.onSelectThread}
                onJumpToAnchor={commentData.onJumpToAnchor}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
};
