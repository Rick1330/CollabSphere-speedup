import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { PrismaService } from "./prisma.service.js";

export const PRISMA_BASE_CLIENT = Symbol("PRISMA_BASE_CLIENT");

export interface PrismaClientProvider extends PrismaService<PrismaClient> {}

@Injectable()
export class PrismaClientProvider {}

@Injectable()
export class PrismaLifecycle implements OnModuleDestroy {
  constructor(@Inject(PRISMA_BASE_CLIENT) private readonly base: PrismaClient) {}

  async onModuleDestroy() {
    await this.base.$disconnect();
  }
}
