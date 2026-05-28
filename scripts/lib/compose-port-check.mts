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

export function collectForeignContainers(
  hostPort: number,
  expectedContainer: string,
): string[] {
  return findContainersOnHostPort(hostPort).filter((name) => name !== expectedContainer);
}

export function collectForeignContainersForPorts(
  checks: Array<{ hostPort: number; expectedContainer: string }>,
): string[] {
  const names = new Set<string>();
  for (const { hostPort, expectedContainer } of checks) {
    for (const name of collectForeignContainers(hostPort, expectedContainer)) {
      names.add(name);
    }
  }
  return [...names];
}

/** Stops containers by name; ignores already-stopped / missing containers. */
export function stopDockerContainers(
  names: string[],
  onLog: (message: string) => void = () => {},
): void {
  for (const name of names) {
    const result = spawnSync("docker", ["stop", name], {
      encoding: "utf8",
      windowsHide: true,
    });

    if (result.status === 0) {
      onLog(`stopped ${name}`);
      continue;
    }

    const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    if (/is not running|no such container|not found/i.test(detail)) {
      onLog(`skip ${name} (not running)`);
      continue;
    }

    throw new Error(
      `docker stop ${name} failed: ${detail || `exit code ${result.status ?? "unknown"}`}`,
    );
  }
}
