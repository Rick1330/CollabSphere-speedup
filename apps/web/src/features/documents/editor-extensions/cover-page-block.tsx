import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { FileText, Calendar, User, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const CoverPageView = ({ node, editor }: NodeViewProps) => {
  const properties = (editor as any).options?.documentProperties || {};
  const docTitle = properties.title || "Untitled Document";
  const projectName = properties.projectName || "Project Name";
  const version = properties.version || "1.0.0";
  const authors = properties.authors || ["Author Name"];

  return (
    <NodeViewWrapper className="my-10 print:my-0">
      <div className="relative min-h-[500px] flex flex-col items-center justify-center p-12 bg-stone-50/30 border border-stone-200 rounded-2xl overflow-hidden print:border-none print:bg-white print:rounded-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-100/50 rounded-full -ml-32 -mb-32 blur-3xl" />

        <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[11px] font-bold text-teal-700 uppercase tracking-widest">
               {projectName}
             </div>
             <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
               {docTitle}
             </h1>
          </div>

          <div className="h-1 w-24 bg-stone-200 mx-auto rounded-full" />

          <div className="grid grid-cols-2 gap-8 text-left max-w-lg mx-auto">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                <Hash className="h-3 w-3" />
                Version
              </div>
              <p className="text-sm font-medium text-stone-700">{version}</p>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                <Calendar className="h-3 w-3" />
                Date
              </div>
              <p className="text-sm font-medium text-stone-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                <User className="h-3 w-3" />
                Prepared By
              </div>
              <div className="flex flex-wrap gap-2">
                {authors.map((author: string, idx: number) => (
                  <span key={idx} className="text-sm font-medium text-stone-700">
                    {author}{idx < authors.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase tracking-widest border-t border-stone-100 pt-6">
          <span>CollabSphere Intelligence</span>
          <span>Confidential</span>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    coverPageBlock: {
      insertCoverPage: () => ReturnType;
    };
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    coverPageBlock: {
      insertCoverPage: () => ReturnType;
    };
  }
}

export const CoverPageBlock = Node.create({
  name: "coverPageBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="cover-page-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "cover-page-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CoverPageView);
  },

  addCommands() {
    return {
      insertCoverPage:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    };
  },
});

