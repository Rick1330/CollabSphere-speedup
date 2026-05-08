# 2026-05-06 — Document editor premium pass (smaller scope, deeper polish)

## Goal
Implement a high-fidelity document editor pass on `apps/web` using only
OSS Tiptap extensions (no Tiptap Pro). Per user direction: "smaller
scope, deeper polish."

## Delivered

### Editor extensions (custom, OSS)
- `apps/web/src/features/documents/editor-extensions/mermaid-block.tsx`
  — Tiptap atom node with ReactNodeView; live Mermaid render with
  Preview/Source tabs; `securityLevel: "strict"`; non-fatal error UX.
- `apps/web/src/features/documents/editor-extensions/math-block.tsx`
  — Tiptap atom node with ReactNodeView; KaTeX render with Preview/LaTeX
  tabs; `trust: false`; non-fatal error UX.

### Editor wiring
- `hooks/use-tiptap-editor.ts` — added Tables (4 OSS extensions),
  MermaidBlock, MathBlock to the extension stack.
- `components/editor/editor-toolbar.tsx` — added Table / Diagram /
  Equation buttons (desktop toolbar).
- `components/editor/editor-slash-command.tsx` — added Table, Diagram,
  Equation slash entries with keyword search.

### Outline + Readiness
- `hooks/use-document-outline.ts` — derives `OutlineNode[]` from live PM
  doc, rAF-throttled; `scrollToOutlineNode` helper.
- `hooks/use-document-readiness.ts` — debounced wrapper around
  `computeReadiness`.
- `components/editor/editor-outline-rail.tsx` — TOC with level-based
  indent and click-to-jump.
- `components/editor/editor-readiness-panel.tsx` — per-section status
  (✓/◐/✗), word-count progress, missing-block hints, click-to-jump.
- `components/editor/editor-context-rail.tsx` — third pane shell with
  Tabs (Readiness | Outline).

### DocumentEditor.tsx integration
- `MockDocument.templateId` field added; mock docs mapped to contract ids
  (`doc-prd`, `doc-rfc`, `doc-adr`, …).
- Pending-doc seed propagates `templateId`.
- Right rail wired into the layout at `lg+`, hidden in focus mode.
- Submit dialog now gated by `readiness.blocksSubmit` with a
  human-readable `blockingReason`.

### Print / PDF (OSS export path)
- Appended `@media print` rules to `apps/web/src/index.css`: hide
  chrome, A4 page, break-inside avoid for tables/code/diagrams/math,
  preview-only for mermaid/math, link URLs printed inline.

### Documentation
- `docs/adrs/0004-document-editor-oss-extensions.md` — OSS-only stance,
  mapping vs. Pro, re-evaluation triggers.
- `docs/agent-ref/ui/document-editor.md` — three-pane shell, extension
  stack, custom blocks, hooks, page-states, print path.
- `docs/agent-ref/ui/document-template-enforcement.md` — contract
  schema, enforcement levels, section detection rules, built-in
  contracts, extending guide.

## Validation
- Web typecheck: `pnpm --filter @collabsphere/web exec tsc -p
  tsconfig.app.json --noEmit` → **0 errors in `apps/web`**.
  (Pre-existing errors in `packages/shared` are unrelated to this pass.)
- Sandbox dev daemon is failing with a harness mismatch (`tsx
  scripts/dev.ts --port` rejects `--port`); not caused by these edits.

## Deferred (next pass)
- Tracked changes / compare versions.
- Server-side PDF/DOCX export.
- Inline math (block-only this pass).
- Block drag handle (`+ ⋮⋮`) — slash menu covers the insert flow.
- Task lists (no `@tiptap/extension-task-list` installed yet).
- Templates governance (prompt 03), Tasks polish (prompt 04).

## Files touched
Created:
- `apps/web/src/features/documents/editor-extensions/mermaid-block.tsx`
- `apps/web/src/features/documents/editor-extensions/math-block.tsx`
- `apps/web/src/features/documents/hooks/use-document-outline.ts`
- `apps/web/src/features/documents/hooks/use-document-readiness.ts`
- `apps/web/src/features/documents/components/editor/editor-outline-rail.tsx`
- `apps/web/src/features/documents/components/editor/editor-readiness-panel.tsx`
- `apps/web/src/features/documents/components/editor/editor-context-rail.tsx`
- `docs/adrs/0004-document-editor-oss-extensions.md`
- `docs/agent-ref/ui/document-editor.md`
- `docs/agent-ref/ui/document-template-enforcement.md`

Edited:
- `apps/web/src/features/documents/hooks/use-tiptap-editor.ts`
- `apps/web/src/features/documents/components/editor/editor-toolbar.tsx`
- `apps/web/src/features/documents/components/editor/editor-slash-command.tsx`
- `apps/web/src/features/documents/pages/DocumentEditor.tsx`
- `apps/web/src/index.css`
