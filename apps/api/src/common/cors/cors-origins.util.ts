const defaultDevCorsOrigins = ["http://127.0.0.1:8080", "http://127.0.0.1:3001"];

export const parseCorsOrigins = (raw: string | undefined): string[] => {
  const origins = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length > 0) {
    return origins;
  }

  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    const fallback = process.env.FRONTEND_URL?.trim();
    return fallback ? [fallback] : [];
  }

  return defaultDevCorsOrigins;
};

export const corsAllowedHeaders = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-CSRF-Token",
  "X-Request-Id",
  "X-Idempotency-Key",
] as const;

export const corsAllowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

export const resolveCorsAllowOrigin = (
  requestOrigin: string | undefined,
  allowed: string[],
): string | null => {
  if (!requestOrigin) {
    return allowed.length === 1 ? allowed[0]! : null;
  }
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return null;
};

export const applyCorsResponseHeaders = (
  res: { setHeader: (name: string, value: string) => void },
  allowOrigin: string | null,
  options?: { includeMethodsAndHeaders?: boolean },
): void => {
  if (!allowOrigin) {
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  if (options?.includeMethodsAndHeaders) {
    res.setHeader("Access-Control-Allow-Methods", corsAllowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", corsAllowedHeaders.join(", "));
  }
};
