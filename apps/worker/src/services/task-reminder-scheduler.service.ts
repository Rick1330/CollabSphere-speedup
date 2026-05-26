import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";
import { WORKER_QUEUES } from "../queues/queue-names.js";

@Injectable()
export class TaskReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(@InjectQueue(WORKER_QUEUES.TASK_REMINDERS) private readonly remindersQueue: Queue) {}

  onModuleInit() {
    this.timer = setInterval(
      () => {
        void this.remindersQueue.add("scan", {}, { removeOnComplete: true, removeOnFail: true });
      },
      10 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
