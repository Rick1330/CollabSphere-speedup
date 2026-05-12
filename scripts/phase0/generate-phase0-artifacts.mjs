import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDir = process.argv[2] ?? "D:/coloe/high-rev";

const specIndexPath = path.join(
  repoRoot,
  "docs",
  "spec",
  "18-appendices",
  "18.3-api-endpoint-index.md",
);
const apiSrcDir = path.join(repoRoot, "apps", "api", "src");
const testsDir = path.join(repoRoot, "tests");

const httpDecorators = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
};

const normalizePath = (rawPath) => {
  const cleaned = rawPath.trim().replace(/^["'`]|["'`]$/g, "");
  const withLeadingSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return withLeadingSlash.replace(/\/+/g, "/");
};

const joinApiPaths = (controllerPath, methodPath) => {
  const left = normalizePath(controllerPath);
  const right = methodPath ? normalizePath(methodPath) : "";
  const merged = `${left}${right}`.replace(/\/+/g, "/");
  return `/api/v1${merged}`.replace(/\/+/g, "/");
};

const toKey = (method, endpointPath) => `${method.toUpperCase()} ${endpointPath}`;

const readTree = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return readTree(full);
      }
      return [full];
    }),
  );
  return nested.flat();
};

const parseSpecEndpoints = async () => {
  const source = await readFile(specIndexPath, "utf8");
  const categoryByLine = new Map();
  let activeCategory = "uncategorized";
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      activeCategory = heading[1].trim();
      continue;
    }
    const endpoint = line.match(/-\s+`(GET|POST|PUT|PATCH|DELETE)\s+([^`]+)`/);
    if (endpoint) {
      categoryByLine.set(toKey(endpoint[1], endpoint[2].trim()), activeCategory);
    }
  }
  return categoryByLine;
};

const parseControllerEndpoints = async () => {
  const files = (await readTree(apiSrcDir)).filter((filePath) =>
    filePath.endsWith(".nest.controller.ts"),
  );
  const endpoints = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const controllerMatch = source.match(/@Controller\((["'`])([^"'`]+)\1\)/);
    if (!controllerMatch) continue;
    const controllerPath = controllerMatch[2];
    const methodRegex =
      /@(Get|Post|Put|Patch|Delete)\((?:(["'`])([^"'`]+)\2)?\)\s*[\r\n]+\s*(?:async\s+)?([A-Za-z0-9_]+)\s*\(/g;
    let match;
    while ((match = methodRegex.exec(source))) {
      const method = httpDecorators[match[1]];
      const methodPath = match[3] ?? "";
      endpoints.push({
        key: toKey(method, joinApiPaths(controllerPath, methodPath)),
        method,
        path: joinApiPaths(controllerPath, methodPath),
        controller: path.relative(repoRoot, filePath).replace(/\\/g, "/"),
        handler: match[4],
      });
    }
  }

  return endpoints;
};

const parseTestedEndpoints = async () => {
  const files = (await readTree(testsDir)).filter((filePath) => filePath.endsWith(".ts"));
  const map = new Map();
  const endpointRegex = /\.(get|post|put|patch|delete)\((["'`])([^"'`]*\/api\/v1\/[^"'`]*)\2\)/gi;

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    let match;
    while ((match = endpointRegex.exec(source))) {
      const method = match[1].toUpperCase();
      const endpointPath = normalizePath(match[3]);
      const key = toKey(method, endpointPath);
      const existing = map.get(key) ?? [];
      existing.push(path.relative(repoRoot, filePath).replace(/\\/g, "/"));
      map.set(key, existing);
    }
  }

  return map;
};

const generate = async () => {
  const specMap = await parseSpecEndpoints();
  const implemented = await parseControllerEndpoints();
  const testedMap = await parseTestedEndpoints();
  const implementedByKey = new Map(implemented.map((entry) => [entry.key, entry]));

  const allKeys = [...new Set([...specMap.keys(), ...implementedByKey.keys(), ...testedMap.keys()])].sort();

  const rows = allKeys.map((key) => {
    const specCategory = specMap.get(key) ?? null;
    const impl = implementedByKey.get(key) ?? null;
    const tests = testedMap.get(key) ?? [];
    return {
      key,
      method: key.split(" ")[0],
      path: key.slice(key.indexOf(" ") + 1),
      specCategory,
      inSpec: specMap.has(key),
      implemented: Boolean(impl),
      implementation: impl
        ? {
            controller: impl.controller,
            handler: impl.handler,
          }
        : null,
      tested: tests.length > 0,
      testFiles: [...new Set(tests)].sort(),
    };
  });

  const summary = {
    total: rows.length,
    inSpec: rows.filter((row) => row.inSpec).length,
    implemented: rows.filter((row) => row.implemented).length,
    tested: rows.filter((row) => row.tested).length,
    specNotImplemented: rows.filter((row) => row.inSpec && !row.implemented).length,
    implementedNotInSpec: rows.filter((row) => !row.inSpec && row.implemented).length,
    implementedNotTested: rows.filter((row) => row.implemented && !row.tested).length,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "phase0-parity-matrix.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)}\n`,
    "utf8",
  );

  const divergenceLines = [
    "# Phase 0 Divergence Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    `- Spec endpoints without implementation: ${summary.specNotImplemented}`,
    `- Implemented endpoints missing from spec: ${summary.implementedNotInSpec}`,
    `- Implemented endpoints without test evidence: ${summary.implementedNotTested}`,
    "",
    "## Spec endpoint gaps",
    ...rows
      .filter((row) => row.inSpec && !row.implemented)
      .map((row) => `- ${row.key}`),
    "",
    "## Implementation not in spec",
    ...rows
      .filter((row) => !row.inSpec && row.implemented)
      .map((row) => `- ${row.key} (${row.implementation.controller})`),
    "",
    "## Implemented but untested",
    ...rows
      .filter((row) => row.implemented && !row.tested)
      .map((row) => `- ${row.key} (${row.implementation.controller})`),
    "",
  ];

  await writeFile(path.join(outputDir, "phase0-divergence-report.md"), divergenceLines.join("\n"), "utf8");

  const architectureLines = [
    "# Phase 0 Current-State Architecture",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Runtime shape",
    "- API runtime: NestJS app with global prefix `/api/v1` in `apps/api/src/main.ts`.",
    "- Endpoint implementation source of truth: `*.nest.controller.ts` in `apps/api/src`.",
    "- UI API seam: `apps/web/src/api/adapters/*` over `apps/web/src/api/client`.",
    "",
    "## Endpoint inventory",
    `- Controllers scanned: ${new Set(implemented.map((entry) => entry.controller)).size}`,
    `- Implemented endpoints discovered: ${summary.implemented}`,
    `- Spec endpoints discovered: ${summary.inSpec}`,
    "",
    "## Testing surface snapshot",
    `- Endpoints with direct HTTP-path evidence in tests: ${summary.tested}`,
    "- Test scan source: `tests/**/*.ts` for supertest style `/api/v1/*` invocations.",
    "",
    "## Notes",
    "- Parity and divergence details are in `phase0-parity-matrix.json` and `phase0-divergence-report.md`.",
    "- This report is machine-generated from repo sources to keep drift visible.",
    "",
  ];
  await writeFile(
    path.join(outputDir, "phase0-current-state-architecture.md"),
    architectureLines.join("\n"),
    "utf8",
  );

  const logLines = [
    "# Phase 0 Recovery Log",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Artifacts",
    "- `phase0-parity-matrix.json`",
    "- `phase0-current-state-architecture.md`",
    "- `phase0-divergence-report.md`",
    "",
    "## Guardrails and gates wired in repo",
    "- ESLint restrictions for direct mock imports in production UI code.",
    "- ESLint restriction to prevent feature-level direct fetch usage outside API client.",
    "- Static API workspace-scope/authz guardrail tests in `tests/unit/phase0-guardrails.test.ts`.",
    "- Minimum test strategy gate manifest and CI workflow assertions.",
    "",
  ];
  await writeFile(path.join(outputDir, "phase0-log.md"), logLines.join("\n"), "utf8");

  const strategyLines = [
    "# Phase 0 Test Strategy Reset",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Minimum gates",
    "- Contract: `tests/phase0/test-strategy-minimum-gates.json`",
    "- Static safety checks: `tests/unit/phase0-guardrails.test.ts`",
    "- CI contract checks: `tests/unit/phase0-test-strategy-gates.test.ts`",
    "",
    "## CI wiring",
    "- Unit-test job executes `pnpm run phase0:guardrails`.",
    "- Standard pipeline retains lint/typecheck/build/integration gates.",
    "",
  ];
  await writeFile(path.join(outputDir, "phase0-test-strategy-reset.md"), strategyLines.join("\n"), "utf8");

  console.log(`Generated Phase 0 artifacts in ${outputDir}`);
  console.log(JSON.stringify(summary, null, 2));
};

void generate();
