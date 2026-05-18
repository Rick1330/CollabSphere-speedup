import { Global, Module } from "@nestjs/common";
import { WorkspaceMembershipGuard } from "./workspace-membership.guard.js";
import { GlobalRolesGuard } from "./global-roles.guard.js";
import { RolesGuard } from "./roles.guard.js";

@Global()
@Module({
  providers: [WorkspaceMembershipGuard, GlobalRolesGuard, RolesGuard],
  exports: [WorkspaceMembershipGuard, GlobalRolesGuard, RolesGuard],
})
export class GuardsNestModule {}
