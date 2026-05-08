import { Module } from "@nestjs/common";
import { HealthNestModule } from "./health/health.nest.module.js";
import { AuthNestModule } from "./auth/auth.nest.module.js";

@Module({
  imports: [HealthNestModule, AuthNestModule],
})
export class AppModule {}
