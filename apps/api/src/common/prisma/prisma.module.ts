import { Global, Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PRISMA_BASE_CLIENT, PrismaClientProvider, PrismaLifecycle } from "./prisma-client.provider.js";
import { createPrismaService, type PrismaService } from "./prisma.service.js";

export type InjectedPrismaClient = PrismaService<PrismaClient>;

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_BASE_CLIENT,
      useFactory: () => new PrismaClient(),
    },
    {
      provide: PrismaClientProvider,
      inject: [PRISMA_BASE_CLIENT],
      useFactory: (base: PrismaClient): InjectedPrismaClient => createPrismaService(base),
    },
    PrismaLifecycle,
  ],
  exports: [PrismaClientProvider],
})
export class PrismaModule {}
