# Document editor — architecture

> Implementation in `apps/web/src/features/documents/`.
> See ADR-0004 for the OSS-only stance.

## Three-pane shell

```text
┌──────────────┬───────────────────────────────────┬──────────────┐
│  Doc tree    │  Writing canvas (Tiptap)          │ Context rail │
│  (lg+)       │  + toolbar, slash menu, status    │  (lg+)       │
│              │                                   │              │
│              │                                   │  • Readiness │
│              │                                   │  • Outline   │
└──────────────┴───────────────────────────────────┴──────────────┘
                                              ┌──────────────┐
                                              │ Comments     │
                                              │ (xl+)        │
                                              └──────────────┘
```

- `< lg` (1024 px): tree and rail collapse to drawers; canvas is full width.
- `< xl` (1280 px): comments rail collapses to drawer.
- **Focus mode** hides tree, rail, and comments.

## Tiptap extension stack

Wired in `apps/web/src/features/documents/hooks/use-tiptap-editor.ts`.

| Extension | Source | Purpose |
|---|---|---|
| `StarterKit` | `@tiptap/starter-kit` | Headings, lists, code, history… |
| `Underline` | `@tiptap/extension-underline` | `⌘U` |
| `Link` | `@tiptap/extension-link` | URLs, no auto-open |
| `Placeholder` | `@tiptap/extension-placeholder` | Heading + body placeholders |
| `Table*` (4) | `@tiptap/extension-table*` | Resizable tables, header row |
| `MermaidBlock` | in-house | Live Mermaid diagram block |
| `MathBlock` | in-house | KaTeX equation block |

## Custom blocks

### `mermaidBlock`

`apps/web/src/features/documents/editor-extensions/mermaid-block.tsx`

- Atom block node with a `code` attribute (raw Mermaid source).
- ReactNodeView with **Preview / Source** tabs.
- Rendering: `mermaid.render()` with `securityLevel: "strict"`.
- Errors render as a non-fatal amber panel — invalid syntax never
  breaks the editor.
- Detected by the readiness engine as `kind: "mermaidBlock"`.

### `mathBlock`

`apps/web/src/features/documents/editor-extensions/math-block.tsx`

- Atom block node with a `latex` attribute.
- ReactNodeView with **Preview / LaTeX** tabs.
- Rendering: `katex.renderToString({ displayMode: true, trust: false })`.
- Errors render inline; `\href{}` etc. are disabled.
- Detected by the readiness engine as `kind: "mathBlock"`.

## Hooks

### `useDocumentOutline(editor)`

Returns an ordered `OutlineNode[]` derived from the live ProseMirror
heading nodes. Throttled to `requestAnimationFrame`. Slugs are
content-derived and de-duplicated.

### `useDocumentReadiness(editor, contract)`

Wraps `computeReadiness` from `template-schema.ts`. Recomputes on every
editor `update` event with a 250ms debounce.

## Right-rail (`EditorContextRail`)

- Two tabs: **Readiness** (when a contract exists) and **Outline**.
- Outline shows headings indented by level, click-to-jump.
- Readiness shows per-section status (✓ / ◐ / ✗), word counts vs.
  minima, and missing required block kinds; click-to-jump when the
  heading is present.

## Print / PDF export

`@media print` rules in `apps/web/src/index.css`:

- Hide all chrome (toolbars, rails, headers, comments).
- Force light theme + A4 margins.
- `break-inside: avoid` on tables, code, blockquotes, diagrams, math.
- Diagram and math blocks render preview only (not source/tabs).
- Inline links print their URL after the link text for context.

Trigger: browser **Print → Save as PDF**. No paid extension needed.
For server-side high-fidelity export, see ADR-0004 re-evaluation
triggers.

## Page-state coverage

The editor surface implements all four canonical page states:

| State | Behaviour |
|---|---|
| Loading | `EditorShellSkeleton` (tree + center skeleton) |
| Empty | Placeholder text in the canvas + outline empty state |
| Error | Document load failure path with retry |
| Loaded | Full editor + toolbars + rail |

## Slash command additions

`apps/web/src/features/documents/components/editor/editor-slash-command.tsx`

Recently added entries:

- **Table** — inserts a 3×3 with header row.
- **Diagram** — inserts an empty `mermaidBlock`.
- **Equation** — inserts an empty `mathBlock`.
