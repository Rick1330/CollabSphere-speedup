import { SetMetadata } from "@nestjs/common";

export const GLOBAL_ROLE_KEY = "globalRole";

export const GlobalRole = (role: "ADMIN") => SetMetadata(GLOBAL_ROLE_KEY, role);
