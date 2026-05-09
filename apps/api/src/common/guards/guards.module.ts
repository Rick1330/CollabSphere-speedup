import { Global, Module } from "@nestjs/common";
import { WorkspaceMembershipGuard } from "./workspace-membership.guard.js";
import { RolesGuard } from "./roles.guard.js";

@Global()
@Module({
  providers: [WorkspaceMembershipGuard, RolesGuard],
  exports: [WorkspaceMembershipGuard, RolesGuard],
})
export class GuardsNestModule {}
