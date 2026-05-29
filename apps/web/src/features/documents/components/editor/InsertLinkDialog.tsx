import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  collectDocumentHeadings,
  toHeadingDomId,
} from "@/features/documents/lib/document-headings";

type LinkMode = "external" | "section";

type InsertLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  initialMode?: LinkMode;
};

export function InsertLinkDialog({
  open,
  onOpenChange,
  editor,
  initialMode = "external",
}: InsertLinkDialogProps) {
  const [mode, setMode] = useState<LinkMode>(initialMode);
  const [url, setUrl] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);

  const headings = useMemo(() => collectDocumentHeadings(editor), [editor, open]);

  useEffect(() => {
    if (!open || !editor || editor.isDestroyed) return;
    setMode(initialMode);
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    if (previous.startsWith("#cs-h-")) {
      setMode("section");
      setSelectedAnchorId(previous.slice(5));
      setUrl("");
      setDisplayText(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " "));
    } else {
      setMode("external");
      setUrl(previous);
      setDisplayText(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " "));
      setSelectedAnchorId(null);
    }
    setValidationError(null);
  }, [open, editor, initialMode]);

  const applyLink = () => {
    if (!editor || editor.isDestroyed) return;
    const chain = editor.chain().focus() as {
      extendMarkRange: (name: string) => {
        setLink: (attrs: { href: string; target?: string | null; rel?: string | null }) => { run: () => void };
        unsetLink: () => { run: () => void };
      };
      insertContent?: (content: string) => { run: () => void };
      insertContentAt?: (range: { from: number; to: number }, content: string) => { run: () => void };
    };

    if (mode === "section") {
      if (!selectedAnchorId) {
        chain.extendMarkRange("link").unsetLink().run();
        onOpenChange(false);
        return;
      }
      chain.extendMarkRange("link").setLink({ href: `#${toHeadingDomId(selectedAnchorId)}` }).run();
      onOpenChange(false);
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      chain.extendMarkRange("link").unsetLink().run();
      onOpenChange(false);
      return;
    }
    if (trimmed.length > 2048) {
      setValidationError("URL is too long (max 2048 characters).");
      return;
    }
    const hasAllowedProtocol = /^(https?:\/\/|mailto:|tel:)/i.test(trimmed);
    if (!hasAllowedProtocol && !/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) {
      setValidationError("URL must start with http://, https://, mailto:, or tel:");
      return;
    }
    const href = hasAllowedProtocol ? trimmed : `https://${trimmed}`;
    setValidationError(null);
    if (displayText.trim()) {
      const { from, to } = editor.state.selection;
      chain.insertContentAt?.({ from, to }, displayText.trim()).run();
    }
    chain.extendMarkRange("link").setLink({
      href,
      target: openInNewTab ? "_blank" : null,
      rel: openInNewTab ? "noopener noreferrer" : null,
    }).run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              mode === "external" && "bg-[var(--brand-50)] font-medium text-[var(--brand-700)]",
            )}
            onClick={() => setMode("external")}
          >
            External URL
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              mode === "section" && "bg-[var(--brand-50)] font-medium text-[var(--brand-700)]",
            )}
            onClick={() => setMode("section")}
          >
            Section in document
          </button>
        </div>
        {mode === "external" ? (
          <div className="grid gap-3 py-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <Label htmlFor="link-text">Text to display</Label>
            <Input
              id="link-text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder="Link text"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="link-new-tab"
                checked={openInNewTab}
                onCheckedChange={(v) => setOpenInNewTab(Boolean(v))}
              />
              <Label htmlFor="link-new-tab">Open in new tab</Label>
            </div>
            {validationError ? (
              <p className="text-xs text-red-600">{validationError}</p>
            ) : null}
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto py-2">
            {headings.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                Add headings to link to a section.
              </p>
            ) : (
              <ul className="space-y-1">
                {headings.map((heading) => (
                  <li key={`${heading.pos}-${heading.anchorId}`}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]",
                        selectedAnchorId === heading.anchorId &&
                          "bg-[var(--brand-50)] text-[var(--brand-700)]",
                      )}
                      style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                      onClick={() => setSelectedAnchorId(heading.anchorId)}
                    >
                      {heading.text || "(Untitled heading)"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={applyLink}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
