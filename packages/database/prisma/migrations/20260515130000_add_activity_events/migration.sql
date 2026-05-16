-- Activity feed: Prisma `ActivityEvent` maps to `activity_events`; table was missing from prior migrations.

CREATE TABLE activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  actor_name_snapshot varchar(200) NOT NULL,
  actor_avatar_snapshot varchar(500),
  event_key varchar(80) NOT NULL,
  summary varchar(255) NOT NULL,
  resource_type resource_type,
  resource_id uuid,
  resource_title_snapshot varchar(255),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_events_workspace_created ON activity_events (workspace_id, created_at DESC);
CREATE INDEX idx_activity_events_workspace_event ON activity_events (workspace_id, event_key, created_at DESC);
CREATE INDEX idx_activity_events_workspace_actor ON activity_events (workspace_id, actor_id, created_at DESC);
