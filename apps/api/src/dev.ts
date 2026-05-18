import { EnvValidationError } from "../../../packages/shared/src/api-env.js";

async function bootstrap() {
  try {
    const { createNestApp, listenNestApp } = await import("./nest-app-bootstrap.js");
    const app = await createNestApp();
    await listenNestApp(app);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`[api] ${error.message}`);
      process.exit(1);
    }

    throw error;
  }
}

void bootstrap();
