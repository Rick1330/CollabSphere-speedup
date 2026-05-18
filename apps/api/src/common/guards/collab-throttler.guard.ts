import { Injectable, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type Resolvable,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
const THROTTLER_LIMIT = "THROTTLER:LIMIT";
const THROTTLER_TTL = "THROTTLER:TTL";
const THROTTLER_TRACKER = "THROTTLER:TRACKER";
const THROTTLER_BLOCK_DURATION = "THROTTLER:BLOCK_DURATION";
const THROTTLER_KEY_GENERATOR = "THROTTLER:KEY_GENERATOR";
const THROTTLER_SKIP = "THROTTLER:SKIP";

const readMethods = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CollabThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (await this.shouldSkip(context)) {
      return true;
    }

    const namedThrottler = this.resolveNamedThrottler(context);
    if (!namedThrottler) {
      return true;
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    const skip = this.reflector.getAllAndOverride(THROTTLER_SKIP + namedThrottler.name, [
      handler,
      classRef,
    ]);
    const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;

    if (skip || skipIf?.(context)) {
      return true;
    }

    const routeOrClassLimit = this.reflector.getAllAndOverride(
      THROTTLER_LIMIT + namedThrottler.name,
      [handler, classRef],
    );
    const routeOrClassTtl = this.reflector.getAllAndOverride(THROTTLER_TTL + namedThrottler.name, [
      handler,
      classRef,
    ]);
    const routeOrClassBlockDuration = this.reflector.getAllAndOverride(
      THROTTLER_BLOCK_DURATION + namedThrottler.name,
      [handler, classRef],
    );
    const routeOrClassGetTracker = this.reflector.getAllAndOverride(
      THROTTLER_TRACKER + namedThrottler.name,
      [handler, classRef],
    );
    const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride(
      THROTTLER_KEY_GENERATOR + namedThrottler.name,
      [handler, classRef],
    );

    const limit = (await this.resolveThrottlerValue(
      context,
      routeOrClassLimit || namedThrottler.limit,
    )) as number;
    const ttl = (await this.resolveThrottlerValue(
      context,
      routeOrClassTtl || namedThrottler.ttl,
    )) as number;
    const blockDuration = (await this.resolveThrottlerValue(
      context,
      routeOrClassBlockDuration || namedThrottler.blockDuration || ttl,
    )) as number;
    const getTracker =
      routeOrClassGetTracker || namedThrottler.getTracker || this.commonOptions.getTracker;
    const generateKey =
      routeOrClassGetKeyGenerator || namedThrottler.generateKey || this.commonOptions.generateKey;

    return this.handleRequest({
      context,
      limit,
      ttl,
      throttler: namedThrottler,
      blockDuration,
      getTracker,
      generateKey,
    });
  }

  private resolveNamedThrottler(context: ExecutionContext) {
    const handler = context.getHandler();
    const classRef = context.getClass();

    for (const name of ["auth", "read", "write"] as const) {
      const hasLimit =
        this.reflector.getAllAndOverride(THROTTLER_LIMIT + name, [handler, classRef]) !==
        undefined;
      const hasTtl =
        this.reflector.getAllAndOverride(THROTTLER_TTL + name, [handler, classRef]) !== undefined;

      if (hasLimit || hasTtl) {
        return this.throttlers.find((throttler) => throttler.name === name);
      }
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    const method = String(request.method ?? "GET").toUpperCase();
    const tier = readMethods.has(method) ? "read" : "write";

    return this.throttlers.find((throttler) => throttler.name === tier);
  }

  private async resolveThrottlerValue<T extends number | string | boolean>(
    context: ExecutionContext,
    resolvable: Resolvable<T>,
  ): Promise<T> {
    return typeof resolvable === "function" ? resolvable(context) : resolvable;
  }
}
