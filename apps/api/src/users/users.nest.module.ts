import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { UsersNestController } from "./users.nest.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [UsersNestController],
  providers: [UsersService],
})
export class UsersNestModule {}
