import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  BarChart3,
  CheckSquare,
  Clock,
  FileText,
  Hash,
  Heading,
  Image,
  MessageSquare,
  Table,
  Type,
} from "lucide-react";
import {
  EditorMetricCard,
  EditorRailHeader,
} from "@/features/documents/components/editor/editor-rail-chrome";
import { useDocumentStats } from "@/features/documents/hooks/use-document-stats";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";

interface EditorLeftSidebarStatsTabProps {
  editor: Editor | null;
  openCommentCount?: number;
  openTaskCount?: number;
}

interface StatMetric {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

export const EditorLeftSidebarStatsTab = ({
  editor,
  openCommentCount = 0,
  openTaskCount = 0,
}: EditorLeftSidebarStatsTabProps) => {
  const stats = useDocumentStats(editor);
  const pageCount = useEditorStore((s) => s.paginationPageCount);

  const commentsLabel =
    openCommentCount > 0 ? `${openCommentCount} open` : "0 open";
  const tasksLabel = openTaskCount > 0 ? `${openTaskCount} open` : "0 open";

  const metrics: StatMetric[] = [
    { label: "Words", value: stats.words.toLocaleString(), icon: Type },
    { label: "Characters", value: stats.characters.toLocaleString(), icon: Hash },
    { label: "Paragraphs", value: stats.paragraphs.toLocaleString(), icon: AlignLeft },
    {
      label: "Reading time",
      value: stats.readingMinutes > 0 ? `${stats.readingMinutes} min` : "—",
      icon: Clock,
    },
    { label: "Pages", value: String(pageCount), icon: FileText },
    { label: "Headings", value: stats.headings.toLocaleString(), icon: Heading },
    { label: "Images", value: stats.images.toLocaleString(), icon: Image },
    { label: "Tables", value: stats.tables.toLocaleString(), icon: Table },
    { label: "Comments", value: commentsLabel, icon: MessageSquare },
    { label: "Tasks", value: tasksLabel, icon: CheckSquare },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 pb-4">
      <EditorRailHeader title="STATS" icon={BarChart3} className="px-1 py-2" />
      <div className="grid grid-cols-2 gap-2 px-1">
        {metrics.map((m) => (
          <EditorMetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            icon={m.icon}
          />
        ))}
      </div>
    </div>
  );
};
