#!/usr/bin/env node
/**
 * Verifies CORS preflight responses from a running local API.
 * Usage: pnpm verify:cors
 * Env: VERIFY_CORS_API_ORIGIN (default http://127.0.0.1:3001)
 *      VERIFY_CORS_SPA_ORIGIN (default http://127.0.0.1:8080)
 */

const apiOrigin = (process.env.VERIFY_CORS_API_ORIGIN ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const spaOrigin = process.env.VERIFY_CORS_SPA_ORIGIN ?? "http://127.0.0.1:8080";

const cases = [
  {
    name: "health OPTIONS (no Origin)",
    url: `${apiOrigin}/api/v1/health`,
    headers: { "Access-Control-Request-Method": "GET" },
    requireAcaO: false,
  },
  {
    name: "workspaces OPTIONS with SPA Origin",
    url: `${apiOrigin}/api/v1/workspaces`,
    headers: {
      Origin: spaOrigin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization, x-csrf-token",
    },
    requireAcaO: true,
    expectedAcaO: spaOrigin,
  },
  {
    name: "workspaces GET 401 still includes ACAO",
    url: `${apiOrigin}/api/v1/workspaces`,
    method: "GET",
    headers: { Origin: spaOrigin },
    requireAcaO: true,
    expectedAcaO: spaOrigin,
    allowStatuses: [401, 403],
  },
];

let failed = 0;

for (const testCase of cases) {
  try {
    const response = await fetch(testCase.url, {
      method: testCase.method ?? "OPTIONS",
      headers: testCase.headers,
    });
    const acao = response.headers.get("access-control-allow-origin");
    const allowedStatuses = testCase.allowStatuses ?? [204, 200];
    const okStatus = allowedStatuses.includes(response.status);

    if (!okStatus) {
      console.error(
        `FAIL ${testCase.name}: expected ${allowedStatuses.join("/")}, got ${response.status}`,
      );
      failed += 1;
      continue;
    }

    if (testCase.requireAcaO) {
      if (!acao) {
        console.error(`FAIL ${testCase.name}: missing Access-Control-Allow-Origin`);
        failed += 1;
        continue;
      }
      if (testCase.expectedAcaO && acao !== testCase.expectedAcaO) {
        console.error(
          `FAIL ${testCase.name}: expected ACAO ${testCase.expectedAcaO}, got ${acao}`,
        );
        failed += 1;
        continue;
      }
    }

    console.log(`OK   ${testCase.name} (${response.status}${acao ? `, ACAO=${acao}` : ""})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${testCase.name}: ${message}`);
    console.error(`     Is the API running at ${apiOrigin}? Try: curl ${apiOrigin}/api/v1/health`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("CORS preflight verification passed.");
