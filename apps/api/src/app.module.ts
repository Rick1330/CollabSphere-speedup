import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { CollabThrottlerGuard } from "./common/guards/collab-throttler.guard.js";
import { configValidationSchema } from "./config/config.schema.js";
import { NestRequestIdMiddleware } from "./common/nest/nest-request-id.middleware.js";
import { PrismaModule } from "./common/prisma/prisma.module.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { GuardsNestModule } from "./common/guards/guards.module.js";
import { HealthNestModule } from "./health/health.nest.module.js";
import { AuthNestModule } from "./auth/auth.nest.module.js";
import { InvitationsNestModule } from "./invitations/invitations.nest.module.js";
import { WorkspacesNestModule } from "./workspaces/workspaces.nest.module.js";
import { DocumentsNestModule } from "./documents/documents.nest.module.js";
import { UsersNestModule } from "./users/users.nest.module.js";
import { TemplatesNestModule } from "./templates/templates.nest.module.js";
import { FoldersNestModule } from "./folders/folders.nest.module.js";
import { RealtimeNestModule } from "./realtime/realtime.nest.module.js";
import { TasksNestModule } from "./tasks/tasks.nest.module.js";
import { CommentsNestModule } from "./comments/comments.nest.module.js";
import { NotificationsNestModule } from "./notifications/notifications.nest.module.js";
import { ActivityNestModule } from "./activity/activity.nest.module.js";
import { SearchNestModule } from "./search/search.nest.module.js";
import { AdminNestModule } from "./admin/admin.nest.module.js";
import { WorkspaceMembershipGuard } from "./common/guards/workspace-membership.guard.js";
import { GlobalRolesGuard } from "./common/guards/global-roles.guard.js";
import { CsrfGuard } from "./common/guards/csrf.guard.js";
import { ExportsNestModule } from "./exports/exports.nest.module.js";
import { TestingNestModule } from "./testing/testing.nest.module.js";
import { DevNestModule } from "./dev/dev.nest.module.js";
import { HttpObservabilityMiddleware } from "./common/observability/http-observability.middleware.js";
import { RedisPublishModule } from "./common/redis/redis-publish.module.js";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    RedisPublishModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        stripUnknown: false,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "read", ttl: 60_000, limit: 120 },
        { name: "write", ttl: 60_000, limit: 30 },
        {
          name: "auth",
          ttl: 900_000,
          limit: (process.env.NODE_ENV ?? "development") === "production" ? 5 : 50,
        },
      ],
      skipIf: (context) => {
        const request = context.switchToHttp().getRequest<{
          method?: string;
          path?: string;
          url?: string;
        }>();
        if (request.method === "OPTIONS") {
          return true;
        }
        const path = request.path ?? request.url ?? "";
        return path.includes("/health") || path.includes("/dev/");
      },
    }),
    PrismaModule,
    GuardsNestModule,
    HealthNestModule,
    AuthNestModule,
    WorkspacesNestModule,
    InvitationsNestModule,
    DocumentsNestModule,
    FoldersNestModule,
    UsersNestModule,
    TemplatesNestModule,
    RealtimeNestModule,
    TasksNestModule,
    CommentsNestModule,
    NotificationsNestModule,
    ActivityNestModule,
    SearchNestModule,
    AdminNestModule,
    ExportsNestModule,
    TestingNestModule,
    DevNestModule,
  ],
  providers: [
    NestRequestIdMiddleware,
    HttpObservabilityMiddleware,
    {
      provide: APP_GUARD,
      useClass: CollabThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: WorkspaceMembershipGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GlobalRolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NestRequestIdMiddleware, HttpObservabilityMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
