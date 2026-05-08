# ADR 0005: Structured Template and Document Blocks

## Context
The current document template system uses basic markdown strings, which lack structural enforcement and rich content capabilities (tables, diagrams, metadata). To achieve a "world-class" standard for academic and professional collaboration, we need a system that supports structured sections, required fields, and advanced embeddable blocks.

## Decision
We will transition to a **Structured Block Model** for templates and documents.

### 1. Template Format (Schema v2)
Templates will move from raw markdown to a structured JSON format:
```json
{
  "schemaVersion": 2,
  "metadata": { "title": "...", "category": "academic" },
  "properties": [
    { "key": "projectName", "type": "string", "required": true }
  ],
  "structure": {
    "blocks": [
      { "type": "section", "title": "Introduction", "required": true },
      { "type": "mermaid-diagram", "config": { "kind": "use-case" } }
    ]
  }
}
```

### 2. Custom Tiptap Nodes
We will implement the following custom blocks as Tiptap extensions:
- **Section Block**: Semantic containers with IDs and "required" flags.
- **Callout Block**: Info/Warning/Success/Error styled boxes.
- **TOC Block**: Auto-generating table of contents.
- **Enhanced Mermaid/Math**: Hover-activated toolbars and manual resizing (already partially implemented).
- **Table Block**: Support for custom dimensions and eventually typed columns.

### 3. Document Properties
Every document will have a `properties` JSONB column in the database to store "frontmatter" (version, authors, project name) which can be injected into the document body or headers/footers.

### 4. Enforcement Strategy
We will implement **Section-level enforcement (Level 3)**:
- A sidebar checklist tracks completion of required sections.
- Deleting required headings triggers a warning or is blocked.
- "Academic Mode" prevents submission if required artifacts are missing.

## Consequences
- **Positive**: Higher document quality, better academic rigor, easier export to PDF/DOCX.
- **Negative**: Increased engineering complexity for custom Tiptap extensions and state sync.
- **Neutral**: Existing markdown templates will be supported as "Legacy" until migrated.
