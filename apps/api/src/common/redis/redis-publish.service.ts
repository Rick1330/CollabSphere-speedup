import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RedisClientType } from "redis";

/** Minimal Redis pub client for collab / realtime side signals. */
@Injectable()
export class RedisPublishService implements OnModuleDestroy {
  private client: RedisClientType | null = null;
  private connectPromise: Promise<RedisClientType> | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }
    if (!this.connectPromise) {
      const url = this.config.getOrThrow<string>("REDIS_URL");
      const client = createClient({ url }) as RedisClientType;
      this.connectPromise = client
        .connect()
        .then(() => {
          this.client = client;
          return client;
        })
        .catch((err) => {
          this.connectPromise = null;
          throw err;
        });
    }
    return this.connectPromise;
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      const c = await this.getClient();
      await c.publish(channel, message);
    } catch (error) {
      console.warn(`[RedisPublishService] publish failed channel=${channel}`, error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit().catch(() => undefined);
    }
    this.client = null;
    this.connectPromise = null;
  }
}
