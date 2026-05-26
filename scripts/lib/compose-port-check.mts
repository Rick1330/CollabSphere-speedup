import { spawnSync } from "node:child_process";

export type ComposePortCheckResult = {
  ok: boolean;
  hostPort: number;
  owners: string[];
  expectedContainer: string;
  hint?: string;
};

/** Containers that publish `hostPort` on the host (0.0.0.0 / [::]). */
export function findContainersOnHostPort(hostPort: number): string[] {
  const ps = spawnSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"], {
    encoding: "utf8",
    windowsHide: true,
  });

  const owners: string[] = [];
  if (ps.status !== 0 || !ps.stdout) {
    return owners;
  }

  const portPattern = new RegExp(
    `(?:0\\.0\\.0\\.0|127\\.0\\.0\\.1|\\[::\\]):${hostPort}(?:->|-)`,
  );

  for (const line of ps.stdout.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const [name, ports = ""] = line.split("\t");
    if (portPattern.test(ports)) {
      owners.push(name?.trim() ?? line);
    }
  }

  return owners;
}

export function checkComposeServicePort(
  hostPort: number,
  expectedContainer: string,
  serviceLabel: string,
): ComposePortCheckResult {
  const owners = findContainersOnHostPort(hostPort);
  const expectedPublishing = owners.includes(expectedContainer);

  if (owners.length === 0) {
    return {
      ok: true,
      hostPort,
      owners,
      expectedContainer,
    };
  }

  if (expectedPublishing && owners.length === 1) {
    return {
      ok: true,
      hostPort,
      owners,
      expectedContainer,
    };
  }

  const foreign = owners.filter((name) => name !== expectedContainer);
  if (foreign.length > 0) {
    return {
      ok: false,
      hostPort,
      owners,
      expectedContainer,
      hint:
        `Port ${hostPort} (${serviceLabel}) is bound by: ${foreign.join(", ")} — not ${expectedContainer}. ` +
        `Fix: docker stop ${foreign.join(" ")}` +
        (expectedPublishing
          ? ""
          : ` && docker compose up -d ${serviceLabel.toLowerCase().replace(/\s+/g, "")}`),
    };
  }

  return {
    ok: true,
    hostPort,
    owners,
    expectedContainer,
  };
}

export function formatComposePortCheckFailure(result: ComposePortCheckResult): string {
  return result.hint ?? `Port ${result.hostPort} check failed for ${result.expectedContainer}`;
}
