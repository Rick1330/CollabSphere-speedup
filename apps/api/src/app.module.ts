import { Module } from "@nestjs/common";
import { HealthNestModule } from "./health/health.nest.module.js";
import { AuthNestModule } from "./auth/auth.nest.module.js";
import { InvitationsNestModule } from "./invitations/invitations.nest.module.js";
import { WorkspacesNestModule } from "./workspaces/workspaces.nest.module.js";
import { DocumentsNestModule } from "./documents/documents.nest.module.js";

@Module({
  imports: [
    HealthNestModule,
    AuthNestModule,
    WorkspacesNestModule,
    InvitationsNestModule,
    DocumentsNestModule,
  ],
})
export class AppModule {}
