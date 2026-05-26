import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
export type CommandPaletteItem = {
  id: string;
  label: string;
  keywords?: string[];
  group?: string;
  shortcut?: string;
  onSelect: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
};

export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps) {
  const groups = items.reduce<Record<string, CommandPaletteItem[]>>((acc, item) => {
    const key = item.group ?? "Actions";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="cs-kit-dialog-overlay" />
        <DialogPrimitive.Content className="cs-kit-command-dialog cs-kit-font-ui" aria-label="Command palette">
          <Command>
            <CommandInput placeholder="Type a command or search…" className="cs-kit-command-input" />
            <CommandList className="cs-kit-command-list">
              <CommandEmpty>No results found.</CommandEmpty>
              {Object.entries(groups).map(([group, groupItems]) => (
                <CommandGroup key={group} heading={group} className="cs-kit-command-group-heading">
                  {groupItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={[item.label, ...(item.keywords ?? [])].join(" ")}
                      className="cs-kit-command-item"
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut ? <span className="cs-kit-menu-shortcut">{item.shortcut}</span> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Hook for ⌘K toggle in showcase / future editor shell */
export function useCommandPaletteHotkey(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}

export function CommandPaletteDemo({ items }: { items: CommandPaletteItem[] }) {
  const [open, setOpen] = useState(false);
  useCommandPaletteHotkey(() => setOpen((v) => !v));

  return (
    <>
      <button type="button" className="cs-kit-btn-ghost cs-kit-focus" onClick={() => setOpen(true)}>
        Open command palette (⌘K)
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </>
  );
}
