import { Inject, Injectable } from "@nestjs/common";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";
import {
  createPrismaBackedRegisterService,
  createPrismaBackedVerifyEmailService,
} from "./auth.service.js";
import { type RegisterInput } from "./register.dto.js";
import { type VerifyEmailInput } from "./verify-email.dto.js";

@Injectable()
export class AuthAppService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async register(input: {
    payload: RegisterInput;
    ipAddress: string;
    userAgent: string;
  }) {
    const registerService = createPrismaBackedRegisterService({
      prisma: this.prisma,
      bcryptCostFactor: apiRuntimeEnv.BCRYPT_COST,
      jwtAccessSecret: apiRuntimeEnv.JWT_ACCESS_SECRET,
    });
    return registerService.register(input);
  }

  async verifyEmail(input: { payload: VerifyEmailInput; ipAddress: string }) {
    const verifyService = createPrismaBackedVerifyEmailService({
      prisma: this.prisma,
    });
    return verifyService.verifyEmail(input);
  }
}
