/**
 * Seeds system workspace + document templates (idempotent upserts).
 * Run: `pnpm --filter @collabsphere/database exec prisma db seed`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const doc = (id, category, name, description, requiredBlockTypes, blocks) => ({
  id,
  kind: "document",
  category,
  subCategory: "general",
  scope: "system",
  name,
  description,
  version: 1,
  schemaVersion: 2,
  contentFormat: "document-v2",
  isEnabled: true,
  content: {
    schemaVersion: 2,
    format: "document-v2",
    metadata: { title: name, category, kind: "document" },
    properties: {
      enforcement: {
        requiredBlockTypes,
      },
    },
    structure: {
      blocks,
    },
  },
});

const workspace = (id, category, name, description, workspacePayload) => ({
  id,
  kind: "workspace",
  category,
  subCategory: "general",
  scope: "system",
  name,
  description,
  version: 1,
  schemaVersion: 2,
  contentFormat: "workspace-v2",
  isEnabled: true,
  content: {
    schemaVersion: 2,
    format: "workspace-v2",
    metadata: { title: name, category, kind: "workspace" },
    structure: {
      workspace: workspacePayload,
    },
  },
});

const defaultTaskColumns = [
  { name: "Backlog", status: "backlog" },
  { name: "To do", status: "todo" },
  { name: "In progress", status: "in_progress" },
  { name: "In review", status: "in_review" },
  { name: "Done", status: "done" },
];

const defaultFolders = [
  { key: "root-docs", name: "Documents" },
  { key: "root-notes", name: "Notes" },
];

async function main() {
  const workspaceTemplates = [
    workspace("general-blank", "general", "General — Blank", "Minimal general workspace.", {
      folders: defaultFolders,
      documents: [{ title: "Welcome", folderKey: "root-docs" }],
      taskColumns: defaultTaskColumns,
      settings: {},
    }),
    workspace(
      "professional-team",
      "professional",
      "Professional — Team",
      "Folders and tasks for delivery teams.",
      {
        folders: [
          { key: "specs", name: "Specs" },
          { key: "delivery", name: "Delivery" },
          { key: "notes", name: "Notes" },
        ],
        documents: [
          { title: "Project overview", folderKey: "specs" },
          { title: "Sprint goals", folderKey: "delivery" },
        ],
        taskColumns: defaultTaskColumns,
        settings: {},
      },
    ),
    workspace("academic-thesis", "academic", "Academic — Thesis", "Thesis workspace layout.", {
      folders: [
        { key: "chapters", name: "Chapters" },
        { key: "references", name: "References" },
        { key: "notes", name: "Supervisor notes" },
      ],
      documents: [
        { title: "Thesis outline", folderKey: "chapters" },
        { title: "Reading list", folderKey: "references" },
      ],
      taskColumns: defaultTaskColumns,
      settings: {},
    }),
    workspace(
      "academic-coursework",
      "academic",
      "Academic — Coursework",
      "Coursework and assignments.",
      {
        folders: [
          { key: "assignments", name: "Assignments" },
          { key: "labs", name: "Labs" },
          { key: "notes", name: "Lecture notes" },
        ],
        documents: [
          { title: "Syllabus snapshot", folderKey: "notes" },
          { title: "Assignment tracker", folderKey: "assignments" },
        ],
        taskColumns: defaultTaskColumns,
        settings: {},
      },
    ),
  ];

  const documentTemplates = [
    doc(
      "meeting-notes",
      "general",
      "Meeting notes",
      "Agenda, notes, and action items.",
      ["heading", "bulletList", "paragraph"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Meeting title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Date / attendees" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Agenda" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Agenda item" }],
                },
              ],
            },
          ],
        },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Notes" }] },
        { type: "paragraph", content: [{ type: "text", text: "Discussion notes…" }] },
      ],
    ),
    doc(
      "project-brief",
      "professional",
      "Project brief",
      "Goals, scope, and stakeholders.",
      ["heading", "paragraph", "bulletList"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Project brief" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Summary" }] },
        { type: "paragraph", content: [{ type: "text", text: "One paragraph summary." }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Goals" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Goal 1" }] },
              ],
            },
          ],
        },
      ],
    ),
    doc(
      "thesis-chapter",
      "academic",
      "Thesis chapter",
      "Chapter scaffold with required sections.",
      ["heading", "paragraph"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Chapter title" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Introduction" }] },
        { type: "paragraph", content: [{ type: "text", text: "Intro text…" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Analysis" }] },
        { type: "paragraph", content: [{ type: "text", text: "Analysis text…" }] },
      ],
    ),
    doc(
      "coursework-assignment",
      "academic",
      "Coursework assignment",
      "Prompt, deliverables, and rubric notes.",
      ["heading", "paragraph", "bulletList"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Assignment" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Instructions" }] },
        { type: "paragraph", content: [{ type: "text", text: "Describe the coursework task." }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Deliverables" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Deliverable 1" }] },
              ],
            },
          ],
        },
      ],
    ),
    {
      id: "general-richdocument-pilot",
      kind: "document",
      category: "general",
      subCategory: "pilot",
      scope: "system",
      name: "Rich document (pilot)",
      description: "Phase T1 richdocument template with variables (smoke test).",
      version: 1,
      schemaVersion: 2,
      contentFormat: "richdocument",
      isEnabled: true,
      content: {
        schemaVersion: 2,
        format: "richdocument",
        metadata: { title: "Rich document (pilot)", kind: "document" },
        properties: {},
        structure: {
          regions: [{ id: "main", key: "main", title: "Main content" }],
          variables: [{ key: "docTitle", label: "Document title", required: false }],
          blocks: [],
        },
      },
    },
  ];

  for (const row of [...workspaceTemplates, ...documentTemplates]) {
    await prisma.template.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        description: row.description,
        content: row.content,
        kind: row.kind,
        category: row.category,
        subCategory: row.subCategory,
        version: row.version,
        schemaVersion: row.schemaVersion,
        contentFormat: row.contentFormat,
        isEnabled: row.isEnabled,
      },
    });
  }

  console.log(`Seeded ${workspaceTemplates.length} workspace + ${documentTemplates.length} document templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
