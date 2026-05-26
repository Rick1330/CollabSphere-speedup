import { useState } from "react";
import {
  Bold,
  FileText,
  Italic,
  Moon,
  Sun,
  Underline,
} from "lucide-react";
import { useThemePreference } from "@/hooks/use-theme-preference";
import {
  Avatar,
  AvatarStack,
  Badge,
  Banner,
  ColorPicker,
  Combobox,
  CommandPaletteDemo,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
  EmptyState,
  Field,
  IconButton,
  Inline,
  Input,
  KeyboardKey,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuSubmenu,
  MenuTrigger,
  NumberStepper,
  Pill,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ResizeHandle,
  SegmentedControl,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Skeleton,
  Slider,
  SplitButton,
  Stack,
  StatusDot,
  Surface,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui-kit";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Surface variant="panel" style={{ padding: "var(--space-6)", borderRadius: "var(--radius-lg)" }}>
      <Stack gap={4}>
        <h2 className="cs-kit-text-xl" style={{ margin: 0, color: "var(--text-strong)" }}>
          {title}
        </h2>
        {children}
      </Stack>
    </Surface>
  );
}

function StateRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <span className="cs-kit-text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <Inline gap={2}>{children}</Inline>
    </Stack>
  );
}

export default function KitShowcasePage() {
  const { resolvedTheme, setPreference } = useThemePreference();
  const [segment, setSegment] = useState("outline");
  const [stepper, setStepper] = useState(3);
  const [sliderVal, setSliderVal] = useState([50]);
  const [color, setColor] = useState("var(--brand-500)");
  const [selectVal, setSelectVal] = useState("a");
  const [comboVal, setComboVal] = useState("doc");
  const [bannerVisible, setBannerVisible] = useState(true);

  const commandItems = [
    { id: "bold", label: "Bold", group: "Format", shortcut: "⌘B", onSelect: () => {} },
    { id: "italic", label: "Italic", group: "Format", shortcut: "⌘I", onSelect: () => {} },
    { id: "share", label: "Share document", group: "File", onSelect: () => {} },
  ];

  return (
    <Surface variant="page" style={{ minHeight: "100vh", padding: "var(--space-8)" }}>
      <Stack gap={8}>
        <Inline gap={4} style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Stack gap={2}>
            <h1 className="cs-kit-text-display" style={{ margin: 0, color: "var(--text-strong)" }}>
              ui-kit showcase
            </h1>
            <p className="cs-kit-text-md" style={{ margin: 0, color: "var(--text-muted)" }}>
              Phase 1 — all primitives in light and dark (toggle below). Dev-only route /_kit
            </p>
          </Stack>
          <Inline gap={2}>
            <button
              type="button"
              className="cs-kit-btn-ghost cs-kit-focus"
              onClick={() => setPreference(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
              {resolvedTheme === "dark" ? "Light" : "Dark"}
            </button>
          </Inline>
        </Inline>

        {bannerVisible ? (
          <Banner variant="info" onDismiss={() => setBannerVisible(false)}>
            Token-driven ui-kit. No document editor files were modified in Phase 1.
          </Banner>
        ) : null}

        <Section title="Surfaces">
          <Inline gap={4}>
            <Surface variant="page" style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              page
            </Surface>
            <Surface variant="panel" style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)" }}>
              panel
            </Surface>
            <Surface variant="inset" style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)" }}>
              inset
            </Surface>
          </Inline>
        </Section>

        <Section title="IconButton states">
          <StateRow label="default / pressed / selected / disabled / loading / error">
            <IconButton aria-label="Bold" tooltip="Bold">
              <Bold size={16} strokeWidth={1.75} />
            </IconButton>
            <IconButton aria-label="Italic pressed" pressed tooltip="Italic">
              <Italic size={16} strokeWidth={1.75} />
            </IconButton>
            <IconButton aria-label="Underline selected" selected tooltip="Underline">
              <Underline size={16} strokeWidth={1.75} />
            </IconButton>
            <IconButton aria-label="Disabled" disabled>
              <Bold size={16} strokeWidth={1.75} />
            </IconButton>
            <IconButton aria-label="Loading" loading>
              <Bold size={16} strokeWidth={1.75} />
            </IconButton>
            <IconButton aria-label="Error" error>
              <Bold size={16} strokeWidth={1.75} />
            </IconButton>
          </StateRow>
        </Section>

        <Section title="Toolbar + SplitButton">
          <Toolbar>
            <ToolbarGroup>
              <IconButton aria-label="Bold" tooltip="Bold">
                <Bold size={16} strokeWidth={1.75} />
              </IconButton>
              <IconButton aria-label="Italic" tooltip="Italic">
                <Italic size={16} strokeWidth={1.75} />
              </IconButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <SplitButton
                label="Share"
                onPrimaryClick={() => {}}
                menuItems={[{ id: "link", label: "Copy link", onSelect: () => {} }]}
              />
            </ToolbarGroup>
          </Toolbar>
        </Section>

        <Section title="Menu">
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                Open menu
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>File</MenuLabel>
              <MenuItem>
                New <MenuShortcut>⌘N</MenuShortcut>
              </MenuItem>
              <MenuSubmenu label="Export">
                <MenuItem>PDF</MenuItem>
                <MenuItem>Markdown</MenuItem>
              </MenuSubmenu>
              <MenuSeparator />
              <MenuItem disabled>Disabled item</MenuItem>
            </MenuContent>
          </Menu>
        </Section>

        <Section title="Popover, Tooltip, Dialog, Sheet, Drawer">
          <Inline gap={4} style={{ flexWrap: "wrap" }}>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                  Popover
                </button>
              </PopoverTrigger>
              <PopoverContent>Popover body using design tokens.</PopoverContent>
            </Popover>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                    Tooltip
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tooltip text</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                  Dialog
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>Modal content with focus trap and Esc to close.</DialogDescription>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                  Sheet
                </button>
              </SheetTrigger>
              <SheetContent>
                <DialogTitle>Right sheet</DialogTitle>
                <DialogDescription>Panel width uses --right-panel-w.</DialogDescription>
              </SheetContent>
            </Sheet>

            <Drawer>
              <DrawerTrigger asChild>
                <button type="button" className="cs-kit-btn-ghost cs-kit-focus">
                  Drawer
                </button>
              </DrawerTrigger>
              <DrawerContent>
                <p className="cs-kit-text-md">Bottom drawer (vaul).</p>
                <DrawerClose asChild>
                  <button type="button" className="cs-kit-btn-primary cs-kit-focus">
                    Close
                  </button>
                </DrawerClose>
              </DrawerContent>
            </Drawer>
          </Inline>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="seg-a">
            <TabsList variant="segmented">
              <TabsTrigger variant="segmented" value="seg-a">
                Segmented A
              </TabsTrigger>
              <TabsTrigger variant="segmented" value="seg-b">
                Segmented B
              </TabsTrigger>
            </TabsList>
            <TabsContent value="seg-a">Segmented tab content A</TabsContent>
            <TabsContent value="seg-b">Segmented tab content B</TabsContent>
          </Tabs>
          <Tabs defaultValue="u-a">
            <TabsList variant="underline">
              <TabsTrigger variant="underline" value="u-a">
                Underline A
              </TabsTrigger>
              <TabsTrigger variant="underline" value="u-b">
                Underline B
              </TabsTrigger>
            </TabsList>
            <TabsContent value="u-a">Underline tab A</TabsContent>
            <TabsContent value="u-b">Underline tab B</TabsContent>
          </Tabs>
        </Section>

        <Section title="Form controls">
          <Stack gap={4}>
            <Field label="Input" hint="Hint text">
              <Input placeholder="Type here" />
            </Field>
            <Field label="Input error" error="This field is required">
              <Input placeholder="Error state" error />
            </Field>
            <Field label="Select">
              <Select
                value={selectVal}
                onValueChange={setSelectVal}
                placeholder="Choose…"
                options={[
                  { value: "a", label: "Option A" },
                  { value: "b", label: "Option B" },
                ]}
              />
            </Field>
            <Field label="Combobox">
              <Combobox
                value={comboVal}
                onValueChange={setComboVal}
                options={[
                  { value: "doc", label: "Document" },
                  { value: "task", label: "Task" },
                ]}
              />
            </Field>
            <Field label="Number stepper">
              <NumberStepper value={stepper} onChange={setStepper} min={1} max={10} />
            </Field>
            <Field label="Slider">
              <Slider value={sliderVal} onValueChange={setSliderVal} max={100} step={1} />
            </Field>
            <Field label="Color picker (§6.15)">
              <ColorPicker
                value={color}
                onChange={setColor}
                onClear={() => setColor("#111827")}
                recentColors={["#14B8A6", "#EF4444", "#3B82F6"]}
                onRecentAdd={(hex) => setColor(hex)}
              />
            </Field>
          </Stack>
        </Section>

        <Section title="Avatar, Badge, Pill, Status">
          <Inline gap={6}>
            <AvatarStack>
              <Avatar fallback="AB" alt="User AB" presence />
              <Avatar fallback="CD" alt="User CD" />
              <Avatar fallback="EF" alt="User EF" />
            </AvatarStack>
            <Inline gap={2}>
              <Badge variant="brand">Brand</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </Inline>
            <Pill>
              <StatusDot variant="success" />
              Live
            </Pill>
          </Inline>
        </Section>

        <Section title="EmptyState, Skeleton, Banner variants">
          <EmptyState
            icon={<FileText size={32} strokeWidth={1.75} />}
            title="No documents yet"
            body="Create a document to get started."
            action={
              <button type="button" className="cs-kit-btn-primary cs-kit-focus">
                New document
              </button>
            }
          />
          <Stack gap={2}>
            <Skeleton height="var(--space-4)" />
            <Skeleton height="var(--space-8)" width="60%" />
          </Stack>
          <Stack gap={2}>
            <Banner variant="success">Success banner</Banner>
            <Banner variant="warning">Warning banner</Banner>
            <Banner variant="danger">Danger banner</Banner>
          </Stack>
        </Section>

        <Section title="SegmentedControl, ResizeHandle, KeyboardKey, CommandPalette">
          <SegmentedControl
            value={segment}
            onValueChange={setSegment}
            options={[
              { value: "files", label: "Files" },
              { value: "outline", label: "Outline" },
              { value: "stats", label: "Stats" },
            ]}
          />
          <Inline gap={2} style={{ alignItems: "stretch", height: "var(--space-12)" }}>
            <Surface variant="inset" style={{ flex: 1, padding: "var(--space-2)" }}>
              Panel
            </Surface>
            <ResizeHandle aria-label="Resize panels" />
            <Surface variant="inset" style={{ flex: 1, padding: "var(--space-2)" }}>
              Panel
            </Surface>
          </Inline>
          <Inline gap={2}>
            <KeyboardKey>⌘</KeyboardKey>
            <KeyboardKey>K</KeyboardKey>
          </Inline>
          <CommandPaletteDemo items={commandItems} />
        </Section>
      </Stack>
    </Surface>
  );
}
