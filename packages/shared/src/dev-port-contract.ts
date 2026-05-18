/**
 * Local dev port contract: API 3001, Vite web 8080, Hocuspocus collab 3002.
 * Validated by `pnpm dev` before starting app processes.
 */

export const DEV_API_PORT = 3001;
export const DEV_WEB_PORT = 8080;
export const DEV_COLLAB_PORT = 3002;

export type DevPortContractIssue = {
  level: "error" | "warning";
  message: string;
};

export type DevPortContractInput = {
  PORT?: string;
  API_BASE_URL?: string;
  BASE_URL?: string;
  WEB_APP_URL?: string;
  CORS_ORIGINS?: string;
  COLLAB_WS_URL?: string;
};

const trim = (value: string | undefined): string | undefined => {
  if (value == null) return undefined;
  const s = value.trim();
  return s.length > 0 ? s : undefined;
};

const parseHttpUrl = (key: string, raw: string | undefined): URL | null => {
  const value = trim(raw);
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const originOf = (url: URL): string => `${url.protocol}//${url.host}`;

const parsePort = (raw: string | undefined, fallback: number): number => {
  const value = trim(raw);
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseCorsOrigins = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const loopbackFamily = (hostname: string): "ipv4-loopback" | "localhost" | "other" => {
  if (hostname === "127.0.0.1") return "ipv4-loopback";
  if (hostname === "localhost") return "localhost";
  return "other";
};

export const validateDevPortContract = (
  input: DevPortContractInput,
): DevPortContractIssue[] => {
  const issues: DevPortContractIssue[] = [];
  const apiPort = parsePort(input.PORT, DEV_API_PORT);
  const apiUrl = parseHttpUrl("API_BASE_URL", input.API_BASE_URL);
  const webUrl =
    parseHttpUrl("WEB_APP_URL", input.WEB_APP_URL) ?? parseHttpUrl("BASE_URL", input.BASE_URL);
  const collabUrl = parseHttpUrl("COLLAB_WS_URL", input.COLLAB_WS_URL);
  const corsOrigins = parseCorsOrigins(input.CORS_ORIGINS);

  if (!apiUrl) {
    issues.push({
      level: "error",
      message: "API_BASE_URL must be a valid absolute URL (e.g. http://127.0.0.1:3001).",
    });
  } else {
    const apiUrlPort =
      apiUrl.port.length > 0 ? Number.parseInt(apiUrl.port, 10) : apiUrl.protocol === "https:" ? 443 : 80;
    if (apiUrlPort !== apiPort) {
      issues.push({
        level: "error",
        message: `PORT=${apiPort} does not match API_BASE_URL port ${apiUrlPort}. Set both to ${DEV_API_PORT} or update Google OAuth redirect URI accordingly.`,
      });
    }
    if (apiUrlPort !== DEV_API_PORT) {
      issues.push({
        level: "warning",
        message: `API_BASE_URL uses port ${apiUrlPort}; canonical local API port is ${DEV_API_PORT}. Update VITE_API_BASE_URL and Google OAuth redirect URI if intentional.`,
      });
    }
  }

  if (!webUrl) {
    issues.push({
      level: "error",
      message: "WEB_APP_URL or BASE_URL must be a valid absolute URL (e.g. http://127.0.0.1:8080).",
    });
  } else {
    const webPort =
      webUrl.port.length > 0 ? Number.parseInt(webUrl.port, 10) : webUrl.protocol === "https:" ? 443 : 80;
    if (webPort !== DEV_WEB_PORT) {
      issues.push({
        level: "warning",
        message: `WEB_APP_URL/BASE_URL uses port ${webPort}; Vite defaults to ${DEV_WEB_PORT}. Open the app at ${originOf(webUrl)} after OAuth.`,
      });
    }
  }

  if (!collabUrl) {
    issues.push({
      level: "error",
      message: "COLLAB_WS_URL must be a valid ws:// or wss:// URL (e.g. ws://127.0.0.1:3002/collab).",
    });
  } else if (collabUrl.protocol !== "ws:" && collabUrl.protocol !== "wss:") {
    issues.push({
      level: "error",
      message: "COLLAB_WS_URL must use ws:// or wss:// scheme.",
    });
  } else {
    const collabPort =
      collabUrl.port.length > 0
        ? Number.parseInt(collabUrl.port, 10)
        : collabUrl.protocol === "wss:"
          ? 443
          : 80;
    if (collabPort !== DEV_COLLAB_PORT) {
      issues.push({
        level: "error",
        message: `COLLAB_WS_URL port ${collabPort} does not match collab service default ${DEV_COLLAB_PORT}. Use ws://127.0.0.1:${DEV_COLLAB_PORT}/collab unless collab PORT was changed in code.`,
      });
    }
    if (collabUrl.pathname !== "/collab") {
      issues.push({
        level: "warning",
        message: `COLLAB_WS_URL path is "${collabUrl.pathname || "/"}"; Hocuspocus uses /collab (e.g. ws://127.0.0.1:${DEV_COLLAB_PORT}/collab).`,
      });
    }
  }

  if (corsOrigins.length === 0) {
    issues.push({
      level: "error",
      message: "CORS_ORIGINS must include at least one origin.",
    });
  } else {
    for (const origin of corsOrigins) {
      try {
        new URL(origin);
      } catch {
        issues.push({
          level: "error",
          message: `CORS_ORIGINS contains invalid origin "${origin}".`,
        });
      }
    }

    if (webUrl) {
      const webOrigin = originOf(webUrl);
      if (!corsOrigins.includes(webOrigin)) {
        issues.push({
          level: "error",
          message: `CORS_ORIGINS must include WEB_APP_URL origin ${webOrigin}.`,
        });
      }
    }

    if (apiUrl) {
      const apiOrigin = originOf(apiUrl);
      if (!corsOrigins.includes(apiOrigin)) {
        issues.push({
          level: "error",
          message: `CORS_ORIGINS must include API_BASE_URL origin ${apiOrigin} (browser calls API directly in dev).`,
        });
      }
    }

    const legacy3000 = corsOrigins.filter((o) => /:3000\/?$/.test(o) || o.endsWith(":3000"));
    if (legacy3000.length > 0) {
      issues.push({
        level: "warning",
        message: `CORS_ORIGINS includes legacy port 3000 (${legacy3000.join(", ")}); remove unless a service still listens on 3000.`,
      });
    }

    if (webUrl) {
      const spa127 = `http://127.0.0.1:${DEV_WEB_PORT}`;
      const spaLocalhost = `http://localhost:${DEV_WEB_PORT}`;
      const has127Spa = corsOrigins.includes(spa127);
      const hasLocalhostSpa = corsOrigins.includes(spaLocalhost);

      if (webUrl.hostname === "127.0.0.1" && !hasLocalhostSpa) {
        issues.push({
          level: "warning",
          message: `Add ${spaLocalhost} to CORS_ORIGINS so API calls work when the browser uses localhost (Vite redirects to 127.0.0.1 but OAuth bookmarks may not).`,
        });
      }
      if (webUrl.hostname === "localhost" && !has127Spa) {
        issues.push({
          level: "warning",
          message: `Add ${spa127} to CORS_ORIGINS to match canonical WEB_APP_URL on 127.0.0.1.`,
        });
      }
      if (!has127Spa && !hasLocalhostSpa && webUrl.port === String(DEV_WEB_PORT)) {
        issues.push({
          level: "warning",
          message: `CORS_ORIGINS should include both ${spa127} and ${spaLocalhost} for local SPA loopback hosts.`,
        });
      }
    }
  }

  const hostnames: string[] = [];
  if (apiUrl) hostnames.push(apiUrl.hostname);
  if (webUrl) hostnames.push(webUrl.hostname);
  for (const origin of corsOrigins) {
    try {
      hostnames.push(new URL(origin).hostname);
    } catch {
      /* invalid origin reported above */
    }
  }

  const loopbackKinds = new Set(
    hostnames.filter((h) => loopbackFamily(h) !== "other").map((h) => loopbackFamily(h)),
  );
  const spa127InCors = corsOrigins.includes(`http://127.0.0.1:${DEV_WEB_PORT}`);
  const spaLocalhostInCors = corsOrigins.includes(`http://localhost:${DEV_WEB_PORT}`);
  const hasPairedSpaCors = spa127InCors && spaLocalhostInCors;

  if (
    loopbackKinds.has("ipv4-loopback") &&
    loopbackKinds.has("localhost") &&
    !hasPairedSpaCors
  ) {
    issues.push({
      level: "warning",
      message:
        "Mixing localhost and 127.0.0.1 without listing both SPA origins in CORS_ORIGINS breaks cross-origin API calls. Add http://127.0.0.1:8080 and http://localhost:8080, or use 127.0.0.1 only everywhere.",
    });
  }

  return issues;
};

export const assertDevPortContract = (input: DevPortContractInput): void => {
  const issues = validateDevPortContract(input);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  for (const warning of warnings) {
    console.warn(`[dev] port contract warning: ${warning.message}`);
  }

  if (errors.length === 0) {
    return;
  }

  const detail = errors.map((e) => `  - ${e.message}`).join("\n");
  throw new Error(`[dev] port contract failed:\n${detail}`);
};
