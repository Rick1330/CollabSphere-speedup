import { createNestApp, listenNestApp } from "./nest-app-bootstrap.js";

async function bootstrap() {
  const app = await createNestApp();
  await listenNestApp(app);
}

void bootstrap();
