import { Global, Module } from "@nestjs/common";
import { PrismaClientProvider } from "./prisma-client.provider.js";

@Global()
@Module({
  providers: [PrismaClientProvider],
  exports: [PrismaClientProvider],
})
export class PrismaModule {}
