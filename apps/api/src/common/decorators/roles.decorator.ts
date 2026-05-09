import { SetMetadata } from "@nestjs/common";
import type { GlobalRole } from "@prisma/client";

export const ROLES_KEY = "collabsphere:roles";

export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
