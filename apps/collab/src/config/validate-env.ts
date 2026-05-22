const REQUIRED_ENV_VARS = ["DATABASE_URL", "REDIS_URL", "COLLAB_JWT_SECRET", "NODE_ENV"] as const;

const applyCollabAliases = () => {
  if (!process.env.DATABASE_URL && process.env.COLLAB_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.COLLAB_DATABASE_URL;
  }
  if (!process.env.REDIS_URL && process.env.COLLAB_REDIS_URL) {
    process.env.REDIS_URL = process.env.COLLAB_REDIS_URL;
  }
};

export const validateEnv = (): void => {
  applyCollabAliases();

  if (!process.env.NODE_ENV?.trim()) {
    process.env.NODE_ENV = "development";
  }

  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  const errors: string[] = [];
  if (missing.length > 0) {
    errors.push(`[collab] Missing required environment variables: ${missing.join(", ")}`);
  }

  const secret = process.env.COLLAB_JWT_SECRET;
  if (secret && secret.length < 32) {
    errors.push("[collab] COLLAB_JWT_SECRET must be at least 32 characters");
  }

  const rawPort = process.env.COLLAB_PORT;
  if (rawPort && (!/^\d+$/.test(rawPort) || Number.parseInt(rawPort, 10) > 65_535)) {
    errors.push("[collab] COLLAB_PORT must be a valid TCP port");
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
};

validateEnv();
