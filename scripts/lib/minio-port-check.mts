import {
  checkComposeServicePort,
  formatComposePortCheckFailure,
  type ComposePortCheckResult,
} from "./compose-port-check.mts";

const EXPECTED_MINIO_CONTAINER = "collabsphere-minio";

export type MinioPortCheckResult = ComposePortCheckResult & {
  expectedContainerPublishing: boolean;
};

/** Which Docker containers publish `hostPort` on the host (e.g. 9000). */
export function checkMinioHostPort(
  hostPort = 9000,
  requirePublished = false,
): MinioPortCheckResult {
  const result = checkComposeServicePort(hostPort, EXPECTED_MINIO_CONTAINER, "minio");
  const expectedContainerPublishing = result.owners.includes(EXPECTED_MINIO_CONTAINER);

  if (requirePublished && result.owners.length === 0) {
    return {
      ...result,
      ok: false,
      expectedContainerPublishing: false,
      hint:
        `No container publishes host port ${hostPort}. ` +
        `Run: docker compose up -d minio (from collabsphere-repo-recovery)`,
    };
  }

  return {
    ...result,
    expectedContainerPublishing,
    hint:
      result.hint ??
      (result.ok
        ? undefined
        : `No container publishes host port ${hostPort}. Run: docker compose up -d minio (from collabsphere-repo-recovery)`),
  };
}

export function formatMinioPortCheckFailure(result: MinioPortCheckResult): string {
  return formatComposePortCheckFailure(result);
}
