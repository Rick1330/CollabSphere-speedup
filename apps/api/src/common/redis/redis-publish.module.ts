import { Global, Module } from "@nestjs/common";
import { RedisPublishService } from "./redis-publish.service.js";

@Global()
@Module({
  providers: [RedisPublishService],
  exports: [RedisPublishService],
})
export class RedisPublishModule {}
