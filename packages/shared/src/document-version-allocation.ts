import type { Prisma } from "@prisma/client";

const MAX_UNIQUE_VIOLATION_RETRIES = 5;

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/** Serialize version-number allocation per document within the current transaction. */
export async function lockDocumentVersionAllocation(
  tx: Prisma.TransactionClient,
  documentId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}::text))`;
}

export async function allocateNextDocumentVersionNumber(
  tx: Prisma.TransactionClient,
  documentId: string,
): Promise<number> {
  await lockDocumentVersionAllocation(tx, documentId);
  const latest = await tx.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return (latest?.versionNumber ?? 0) + 1;
}

/** Retry whole transaction callbacks when a version row races without advisory locks. */
export async function runWithDocumentVersionRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_UNIQUE_VIOLATION_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}
