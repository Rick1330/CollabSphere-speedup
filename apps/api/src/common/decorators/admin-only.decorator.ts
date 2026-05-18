import { applyDecorators, SetMetadata } from "@nestjs/common";
import { GLOBAL_ROLE_KEY } from "./global-role.decorator.js";

export const ADMIN_ONLY_KEY = "collabsphere:adminOnly";

/** Marks route as platform-admin only. Sets both legacy and globalRole metadata. */
export const AdminOnly = () =>
  applyDecorators(SetMetadata(ADMIN_ONLY_KEY, true), SetMetadata(GLOBAL_ROLE_KEY, "ADMIN"));
