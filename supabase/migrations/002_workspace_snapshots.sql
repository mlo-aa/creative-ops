-- Snapshot-based workspace persistence (single row: id = 'main')

CREATE TABLE IF NOT EXISTS workspace_snapshots (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personal single-user app — allow anon read/write (no auth)
ALTER TABLE workspace_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_snapshots_anon_all"
  ON workspace_snapshots
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON workspace_snapshots TO anon, authenticated, service_role;
