import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { startVerificationEmailProcessor } from "../jobs/email/verification-email-processor.js";
import { startWorkspaceInvitationEmailProcessor } from "../jobs/email/workspace-invitation-email-processor.js";

@Injectable()
export class EmailBootstrapService implements OnModuleInit, OnModuleDestroy {
  private stopVerification?: () => void;
  private stopInvitation?: () => void;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  onModuleInit() {
    const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ?? "";
    const baseUrl =
      this.config.get<string>("worker.apiBaseUrl") ?? process.env.BASE_URL ?? "http://localhost:3000";

    this.stopVerification = startVerificationEmailProcessor({
      jwtAccessSecret,
      baseUrl,
    });
    this.stopInvitation = startWorkspaceInvitationEmailProcessor({
      jwtAccessSecret,
      baseUrl,
    });
  }

  onModuleDestroy() {
    this.stopVerification?.();
    this.stopInvitation?.();
  }
}
