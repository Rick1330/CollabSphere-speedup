# ADR 0004 — Document editor extensions: OSS-only stance

- **Status**: Accepted
- **Date**: 2026-05-06
- **Deciders**: Web platform working group
- **Related**: dev-rev §11, `docs/spec/document-editor.md` (forthcoming)

## Context

CollabSphere documents need richer structured content than the StarterKit
default — at minimum tables, diagrams, math, an outline rail, and a
template-readiness gate that prevents premature submission. Tiptap ships
several of these as **paid Pro extensions**:

| Need | Tiptap Pro option | Cost / lock-in |
|---|---|---|
| Tables | `@tiptap/extension-table` | Free (OSS) |
| Drag handle (block grip) | `@tiptap-pro/extension-drag-handle` | Paid |
| Slash commands | `@tiptap-pro/extension-slash-command` | Paid |
| Mathematics | `@tiptap-pro/extension-mathematics` | Paid |
| Mermaid | `@tiptap-pro/extension-mermaid` | Paid |
| Document export (DOCX/PDF) | `@tiptap-pro/extension-export` | Paid |
| Comments | `@tiptap-pro/extension-comments` | Paid |
| AI commands | Tiptap AI | Paid |

We do not have budget approval for a Tiptap Pro license, and several of
the paid features (comments, AI) are already implemented in CollabSphere
with our own logic. Procuring Pro for diagrams + math alone would lock
the editor into a single vendor for surfaces we can build ourselves.

## Decision

The CollabSphere editor uses **OSS-only Tiptap extensions**. Where Pro
ships an out-of-the-box solution, we build the equivalent on top of
public APIs (`Node.create`, `ReactNodeViewRenderer`) and OSS rendering
libraries:

| Need | Our approach | Library |
|---|---|---|
| Tables | OSS extensions | `@tiptap/extension-table*` |
| Slash commands | Custom plugin | (in-house) |
| Mermaid diagrams | Custom NodeView | `mermaid` (MIT) |
| Math (block) | Custom NodeView | `katex` (MIT) |
| Outline rail | Custom hook | (in-house) |
| Template readiness | Custom engine | (in-house) |
| PDF export | Browser print dialog | `@media print` rules |
| Comments | Already in-house | (existing) |
| AI commands | Out of scope this pass | — |

DOCX export and inline math are explicitly deferred — the browser print
path covers PDF needs at acceptable fidelity, and inline math fights
naturally with code spans for the `$` trigger.

## Consequences

### Positive

- Zero vendor cost; no license tracking.
- Full control over data model — diagrams and equations are first-class
  document blocks, detectable by the readiness engine.
- Custom NodeViews can be optimised for our use cases (Mermaid renders
  with `securityLevel: "strict"`; KaTeX with `trust: false`).
- Migrating off Tiptap (e.g. to ProseMirror direct) costs less because
  we already own the non-trivial extensions.

### Negative

- Maintenance burden: we own the slash command, the diagram block, the
  math block. Bugs are ours to fix.
- No `compareDocuments` / tracked changes out of the box. If the product
  later requires this we re-evaluate Pro vs. building on `@tiptap-pro`'s
  open API description.
- Server-side PDF/DOCX rendering needs separate work (Puppeteer/Pandoc
  worker) when we want one-click exports without the print dialog.

### Re-evaluation triggers

Reopen this ADR if any of the following become true:

1. Product demands tracked changes / compare versions.
2. We need server-side high-fidelity PDF export at scale.
3. Tiptap Pro pricing drops below ~$200/year per surface and at least
   three Pro features become required.
