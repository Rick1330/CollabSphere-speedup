import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
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
import { AdminOnlyGuard } from "./common/guards/admin-only.guard.js";
import { ExportsNestModule } from "./exports/exports.nest.module.js";
import { HttpObservabilityMiddleware } from "./common/observability/http-observability.middleware.js";

@Module({
  imports: [
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
  ],
  providers: [
    NestRequestIdMiddleware,
    HttpObservabilityMiddleware,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminOnlyGuard,
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
