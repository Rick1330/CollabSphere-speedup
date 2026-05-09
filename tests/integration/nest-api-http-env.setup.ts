/**
 * Loaded via `tsx --import` before integration tests so `api-runtime` validation passes.
 */
const assign = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

assign("DATABASE_URL", "postgresql://collab:collab@127.0.0.1:5432/collabsphere");
assign("REDIS_URL", "redis://127.0.0.1:6379");
assign("JWT_ACCESS_SECRET", "integration-test-jwt-secret-at-least-32-characters");
assign("JWT_ACCESS_TTL_MINUTES", "15");
assign("REFRESH_TOKEN_TTL_DAYS", "7");
assign("CORS_ORIGINS", "http://localhost:3000");
assign("EMAIL_PROVIDER_API_KEY", "integration-test-email-provider-key");
assign("API_BASE_URL", "http://127.0.0.1:3001");
assign("BASE_URL", "http://127.0.0.1:3000");
assign("BCRYPT_COST", "12");
