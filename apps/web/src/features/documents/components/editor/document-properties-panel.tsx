import { useState, useEffect } from "react";
import { Info, Save, UserPlus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentProperties {
  projectName?: string;
  version?: string;
  authors?: string[];
  [key: string]: any;
}

interface DocumentPropertiesPanelProps {
  properties: DocumentProperties;
  onUpdate: (props: DocumentProperties) => void;
}

export const DocumentPropertiesPanel = ({
  properties,
  onUpdate,
}: DocumentPropertiesPanelProps) => {
  const [localProps, setLocalProps] = useState<DocumentProperties>(properties || {});
  const [newAuthor, setNewAuthor] = useState("");

  useEffect(() => {
    setLocalProps(properties || {});
  }, [properties]);

  const handleSave = () => {
    onUpdate(localProps);
  };

  const addAuthor = () => {
    if (!newAuthor.trim()) return;
    const authors = [...(localProps.authors || []), newAuthor.trim()];
    setLocalProps({ ...localProps, authors });
    setNewAuthor("");
  };

  const removeAuthor = (index: number) => {
    const authors = (localProps.authors || []).filter((_, i) => i !== index);
    setLocalProps({ ...localProps, authors });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-4 pt-4 pb-2 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-stone-900 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-teal-600" />
            Properties
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSave}
            className="h-7 px-2 text-[11px] text-teal-600 hover:text-teal-700 hover:bg-teal-50"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Save
          </Button>
        </div>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Document metadata & frontmatter
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
            Project Name
          </Label>
          <Input
            id="project-name"
            value={localProps.projectName || ""}
            onChange={(e) => setLocalProps({ ...localProps, projectName: e.target.value })}
            placeholder="e.g. Apollo Mission"
            className="h-9 text-[13px]"
          />
        </div>

        {/* Version */}
        <div className="space-y-2">
          <Label htmlFor="doc-version" className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
            Version
          </Label>
          <Input
            id="doc-version"
            value={localProps.version || ""}
            onChange={(e) => setLocalProps({ ...localProps, version: e.target.value })}
            placeholder="e.g. 1.0.0-draft"
            className="h-9 text-[13px]"
          />
        </div>

        {/* Authors */}
        <div className="space-y-3">
          <Label className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
            Authors
          </Label>
          
          <div className="space-y-1.5">
            {(localProps.authors || []).map((author, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between group p-2 rounded-lg border border-stone-100 bg-stone-50/50 hover:border-stone-200 transition-colors"
              >
                <span className="text-[13px] text-stone-700 truncate">{author}</span>
                <button 
                  onClick={() => removeAuthor(idx)}
                  className="p-1 rounded text-stone-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5 mt-2">
            <Input
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Add author..."
              className="h-8 text-[12px]"
              onKeyDown={(e) => e.key === "Enter" && addAuthor()}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addAuthor}
              className="h-8 px-2 border-dashed border-stone-300 text-stone-500"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <footer className="p-4 bg-stone-50 border-t border-stone-100">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-teal-50/50 border border-teal-100">
          <Info className="h-3.5 w-3.5 text-teal-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-teal-800 leading-relaxed">
            These properties are used for auto-generating cover pages and headers when exporting.
          </p>
        </div>
      </footer>
    </div>
  );
};
