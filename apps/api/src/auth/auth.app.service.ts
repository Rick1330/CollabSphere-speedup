import { Injectable } from "@nestjs/common";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import {
  createPrismaBackedRegisterService,
  createPrismaBackedVerifyEmailService,
} from "./auth.service.js";
import { type RegisterInput } from "./register.dto.js";
import { type VerifyEmailInput } from "./verify-email.dto.js";

@Injectable()
export class AuthAppService {
  constructor(private readonly prisma: PrismaClientProvider) {}

  async register(input: {
    payload: RegisterInput;
    ipAddress: string;
    userAgent: string;
  }) {
    const registerService = createPrismaBackedRegisterService({
      prisma: this.prisma,
      bcryptCostFactor: Number.parseInt(process.env.BCRYPT_COST ?? "12", 10),
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-insecure-secret",
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
