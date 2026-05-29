/**
 * Export filled golden-workspace documents into template-seed JSON files.
 *
 * Usage (from repo root):
 *   pnpm export:golden-templates --discover
 *   pnpm export:golden-templates
 *
 * Auto-resolves workspaces for elshadayrick7@gmail.com by name (addendum C.1–E.2).
 * Optional overrides: scripts/golden-template-sources.json
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");

const loadRepoEnv = () => {
  for (const name of [".env", ".env.local"]) {
    const path = join(REPO_ROOT, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) {
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
};

loadRepoEnv();

const MANIFEST_PATH = join(REPO_ROOT, "scripts/golden-template-sources.json");
const SEEDS_DIR = join(__dirname, "template-seeds");

const GOLDEN_USER_EMAIL = "elshadayrick7@gmail.com";

/** tpl_workspace_* → addendum titles + seed catalog aliases */
const WORKSPACE_TEMPLATE_NAME_MAP = [
  {
    id: "tpl_workspace_academic_senior_project_v1",
    names: [
      "C.1 Template: Senior Project (University Academic)",
      "Senior Project",
    ],
    fingerprint: "senior project",
  },
  {
    id: "tpl_workspace_academic_research_thesis_v1",
    names: ["C.2 Template: Research Thesis", "Research Thesis"],
    fingerprint: "research thesis",
  },
  {
    id: "tpl_workspace_academic_group_assignment_v1",
    names: [
      "C.3 Template: Group Assignment (Course Project)",
      "Group Assignment",
    ],
    fingerprint: "group assignment",
  },
  {
    id: "tpl_workspace_academic_lab_assignment_v1",
    names: [
      "C.4 Template: Lab / Practical Assignment",
      "Lab Assignment",
      "Lab / Practical Assignment",
    ],
    fingerprint: "lab practical assignment",
  },
  {
    id: "tpl_workspace_professional_software_project_v1",
    names: [
      "D.1 Template: Software Development Project",
      "Software Development Project",
    ],
    fingerprint: "software development project",
  },
  {
    id: "tpl_workspace_professional_sprint_v1",
    names: ["D.2 Template: Sprint Workspace", "Sprint Workspace"],
    fingerprint: "sprint workspace",
  },
  {
    id: "tpl_workspace_professional_client_project_v1",
    names: [
      "D.3 Template: Client Project (Agency / Freelance)",
      "Client Project",
    ],
    fingerprint: "client project",
  },
  {
    id: "tpl_workspace_professional_open_source_v1",
    names: ["D.4 Template: Open Source Project", "Open Source Project"],
    fingerprint: "open source project",
  },
  {
    id: "tpl_workspace_general_blank_v1",
    names: ["E.1 Blank Workspace", "Blank Workspace"],
    fingerprint: "blank workspace",
  },
  {
    id: "tpl_workspace_general_personal_v1",
    names: [
      "E.2 Personal Notes & Tasks",
      "Personal Notes & Tasks",
      "Personal Workspace",
    ],
    fingerprint: "personal notes tasks",
  },
];

const CANONICAL_WORKSPACE_TEMPLATE_IDS = WORKSPACE_TEMPLATE_NAME_MAP.map((e) => e.id);

const normalizeName = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/^[a-z]\d+\s+/, "");

const normalizeTitle = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const parseWorkspaceDocumentsFromTemplate = (content) => {
  if (!isRecord(content)) return [];
  const structure = isRecord(content.structure) ? content.structure : null;
  const workspace = structure && isRecord(structure.workspace) ? structure.workspace : null;
  if (!workspace || !Array.isArray(workspace.documents)) return [];
  return workspace.documents
    .filter(isRecord)
    .map((doc) => ({
      key: typeof doc.key === "string" ? doc.key.trim() : "",
      title: typeof doc.title === "string" ? doc.title.trim() : "",
      documentTemplateId:
        typeof doc.documentTemplateId === "string" ? doc.documentTemplateId.trim() : "",
    }))
    .filter((doc) => doc.title && doc.documentTemplateId);
};

const loadManifestOverrides = () => {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    if (!isRecord(raw)) return {};
    const overrides = {};
    for (const id of CANONICAL_WORKSPACE_TEMPLATE_IDS) {
      const value = raw[id];
      if (typeof value === "string" && value.trim()) {
        overrides[id] = value.trim();
      }
    }
    return overrides;
  } catch {
    return {};
  }
};

/**
 * @param {Array<{ id: string; name: string; type: string; documentCount: number }>} workspaces
 */
const resolveWorkspaceMappings = (workspaces, overrides) => {
  const usedWorkspaceIds = new Set();
  const mappings = [];
  const unmatched = [];

  for (const entry of WORKSPACE_TEMPLATE_NAME_MAP) {
    if (overrides[entry.id]) {
      mappings.push({
        templateId: entry.id,
        workspaceId: overrides[entry.id],
        workspaceName: workspaces.find((w) => w.id === overrides[entry.id])?.name ?? "(override)",
        matchMethod: "manifest-override",
      });
      usedWorkspaceIds.add(overrides[entry.id]);
      continue;
    }

    const normalizedAliases = new Set(
      entry.names.map((name) => normalizeName(name)).filter(Boolean),
    );
    const fingerprint = normalizeName(entry.fingerprint);

    let match = workspaces.find((ws) => {
      if (usedWorkspaceIds.has(ws.id)) return false;
      const norm = normalizeName(ws.name);
      return normalizedAliases.has(norm);
    });

    if (!match) {
      const candidates = workspaces.filter((ws) => {
        if (usedWorkspaceIds.has(ws.id)) return false;
        const norm = normalizeName(ws.name);
        return norm.includes(fingerprint) || fingerprint.split(" ").every((w) => norm.includes(w));
      });
      if (candidates.length === 1) {
        match = candidates[0];
      }
    }

    if (match) {
      mappings.push({
        templateId: entry.id,
        workspaceId: match.id,
        workspaceName: match.name,
        matchMethod: "auto-name",
      });
      usedWorkspaceIds.add(match.id);
    } else {
      unmatched.push(entry.id);
    }
  }

  return { mappings, unmatched, usedWorkspaceIds };
};

const prisma = new PrismaClient();

async function loadGoldenWorkspaces(userId) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, isActive: true, deletedAt: null, workspace: { deletedAt: null } },
    select: {
      workspace: {
        select: {
          id: true,
          name: true,
          type: true,
          _count: { select: { documents: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  return memberships.map((row) => ({
    id: row.workspace.id,
    name: row.workspace.name,
    type: row.workspace.type,
    documentCount: row.workspace._count.documents,
  }));
}

async function discoverGoldenWorkspaces(userId) {
  const workspaces = await loadGoldenWorkspaces(userId);
  const overrides = loadManifestOverrides();
  const { mappings, unmatched } = resolveWorkspaceMappings(workspaces, overrides);

  console.log(`\nWorkspaces for ${GOLDEN_USER_EMAIL} (${workspaces.length}):\n`);
  for (const ws of workspaces) {
    console.log(
      `  ${ws.id}  |  ${ws.type.padEnd(12)}  |  ${String(ws.documentCount).padStart(2)} docs  |  ${ws.name}`,
    );
  }

  console.log("\nResolved golden workspace → template mappings:\n");
  for (const map of mappings) {
    console.log(
      `  ${map.templateId}\n    → ${map.workspaceId}  (${map.matchMethod})\n    "${map.workspaceName}"`,
    );
  }

  if (unmatched.length > 0) {
    console.log("\nUnmatched templates (need manifest override or rename workspace):\n");
    for (const id of unmatched) {
      const entry = WORKSPACE_TEMPLATE_NAME_MAP.find((e) => e.id === id);
      console.log(`  ${id}`);
      if (entry) {
        console.log(`    expected names: ${entry.names.join(" | ")}`);
      }
    }
  }

  console.log(`\nMapped ${mappings.length}/${CANONICAL_WORKSPACE_TEMPLATE_IDS.length} templates.\n`);

  const templates = await prisma.template.findMany({
    where: { id: { in: CANONICAL_WORKSPACE_TEMPLATE_IDS }, kind: "workspace" },
    select: { id: true, name: true, content: true },
  });

  console.log("Canonical workspace templates (expected document counts):\n");
  for (const tpl of templates) {
    const docs = parseWorkspaceDocumentsFromTemplate(tpl.content);
    const mapped = mappings.find((m) => m.templateId === tpl.id);
    const status = mapped ? "mapped" : "MISSING";
    console.log(
      `  ${tpl.id}  →  ${docs.length} documents  (${tpl.name})  [${status}]`,
    );
  }
}

async function exportGoldenTemplates(userId) {
  const workspaces = await loadGoldenWorkspaces(userId);
  const overrides = loadManifestOverrides();
  const { mappings, unmatched } = resolveWorkspaceMappings(workspaces, overrides);

  if (unmatched.length > 0) {
    console.error("\nCannot export — unmatched workspace templates:");
    for (const id of unmatched) {
      console.error(`  - ${id}`);
    }
    console.error("\nRun with --discover to see available workspaces.\n");
    process.exit(1);
  }

  const exportedByTemplateId = new Map();
  let skipCount = 0;

  mkdirSync(SEEDS_DIR, { recursive: true });

  for (const { templateId: workspaceTemplateId, workspaceId, workspaceName } of mappings) {
    console.log(`\nExporting ${workspaceTemplateId} from "${workspaceName}"...`);

    const workspaceTemplate = await prisma.template.findFirst({
      where: { id: workspaceTemplateId, kind: "workspace" },
      select: { id: true, content: true },
    });
    if (!workspaceTemplate) {
      console.warn(`Workspace template not in DB: ${workspaceTemplateId}`);
      continue;
    }

    const specDocs = parseWorkspaceDocumentsFromTemplate(workspaceTemplate.content);
    const goldenDocs = await prisma.document.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        id: true,
        title: true,
        contentYjs: true,
        contentPlaintext: true,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    const goldenByTitle = new Map();
    for (const doc of goldenDocs) {
      goldenByTitle.set(normalizeTitle(doc.title), doc);
    }

    for (const spec of specDocs) {
      const golden = goldenByTitle.get(normalizeTitle(spec.title));
      if (!golden) {
        console.warn(
          `  No match for "${spec.title}" → ${spec.documentTemplateId}`,
        );
        skipCount += 1;
        continue;
      }

      const yjsBytes = golden.contentYjs ? Buffer.from(golden.contentYjs) : Buffer.alloc(0);
      if (yjsBytes.byteLength === 0) {
        console.warn(
          `  Empty contentYjs for "${spec.title}" → ${spec.documentTemplateId}`,
        );
        skipCount += 1;
        continue;
      }

      const b64 = yjsBytes.toString("base64");
      const existing = exportedByTemplateId.get(spec.documentTemplateId);
      if (existing && existing.contentYjsBase64.length >= b64.length) {
        continue;
      }

      exportedByTemplateId.set(spec.documentTemplateId, {
        id: spec.documentTemplateId,
        sourceWorkspaceTemplateId: workspaceTemplateId,
        sourceDocumentTitle: spec.title,
        contentYjsBase64: b64,
        contentPlaintext: golden.contentPlaintext?.trim() ?? "",
        blocks: [],
      });
    }
  }

  let exportCount = 0;
  for (const asset of exportedByTemplateId.values()) {
    const outPath = join(SEEDS_DIR, `${asset.id}.json`);
    writeFileSync(outPath, JSON.stringify(asset, null, 2), "utf8");
    exportCount += 1;
    console.log(`Wrote ${asset.id} (${asset.contentYjsBase64.length} b64 chars)`);
  }

  console.log(`\nExported ${exportCount} document template seed(s); skipped ${skipCount} mapping(s).`);
  if (exportCount === 0) {
    process.exit(1);
  }
}

async function main() {
  const discover = process.argv.includes("--discover");
  const user = await prisma.user.findFirst({
    where: { email: GOLDEN_USER_EMAIL },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`User not found: ${GOLDEN_USER_EMAIL}`);
    process.exit(1);
  }

  if (discover) {
    await discoverGoldenWorkspaces(user.id);
    return;
  }

  await exportGoldenTemplates(user.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
