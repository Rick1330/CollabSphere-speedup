-- Task hierarchy and dependency graph
ALTER TABLE "tasks" ADD COLUMN "parent_id" UUID;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "tasks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_tasks_workspace_parent" ON "tasks"("workspace_id", "parent_id");

CREATE TABLE "task_dependencies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "dependent_task_id" UUID NOT NULL,
  "blocking_task_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_task_dependencies_pair"
  ON "task_dependencies"("dependent_task_id", "blocking_task_id");

CREATE INDEX "idx_task_dependencies_workspace"
  ON "task_dependencies"("workspace_id");

ALTER TABLE "task_dependencies"
  ADD CONSTRAINT "task_dependencies_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "task_dependencies"
  ADD CONSTRAINT "task_dependencies_dependent_task_id_fkey"
  FOREIGN KEY ("dependent_task_id") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_dependencies"
  ADD CONSTRAINT "task_dependencies_blocking_task_id_fkey"
  FOREIGN KEY ("blocking_task_id") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
