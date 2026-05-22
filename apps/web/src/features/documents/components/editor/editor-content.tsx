import { forwardRef } from "react";
import { EditorContent as TiptapEditorContent, type Editor } from "@tiptap/react";

interface EditorContentAreaProps {
  editor: Editor | null;
  /** Writing column (pointer overlay coordinates are relative to this element). */
  writingColumnRef?: React.Ref<HTMLDivElement>;
  /** Optional content rendered inside the writing column (e.g. inline anchor highlights). */
  children?: React.ReactNode;
}

export const EditorContentArea = forwardRef<HTMLDivElement, EditorContentAreaProps>(
  ({ editor, writingColumnRef, children }, ref) => (
    <div ref={ref} className="flex-1 overflow-y-auto bg-white relative">
      <div
        ref={writingColumnRef}
        data-collab-writing-column
        className="max-w-3xl mx-auto px-6 py-8 md:px-10 md:py-12 lg:px-16 lg:py-16 relative overflow-visible"
      >
        <TiptapEditorContent editor={editor} />
        {children}
      </div>
    </div>
  ),
);
EditorContentArea.displayName = "EditorContentArea";
