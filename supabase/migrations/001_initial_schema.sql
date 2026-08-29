-- Creative Ops — personal single-user workspace (no auth / no RLS)
-- Run in Supabase SQL Editor or via supabase db push

-- ── Projects ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL,
  client_name   TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',
  project_color TEXT NOT NULL DEFAULT '#6D758F',
  start_date    DATE,
  deadline      DATE,
  types         JSONB NOT NULL DEFAULT '[]',
  intake_step   INT DEFAULT 0,
  intake_done   BOOLEAN DEFAULT FALSE,
  format_id     TEXT NOT NULL DEFAULT 'instagram-portrait',
  export_prefix TEXT NOT NULL DEFAULT '',
  brand         JSONB NOT NULL DEFAULT '{}',
  graphics      JSONB,
  is_seed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_intake (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_strategy (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_notes (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_extensions (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sources & references ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_sources (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL DEFAULT '',
  source_type         TEXT NOT NULL DEFAULT 'url',
  category            TEXT NOT NULL DEFAULT 'other',
  url                 TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  priority            TEXT NOT NULL DEFAULT 'normal',
  status              TEXT NOT NULL DEFAULT 'current',
  is_source_of_truth  BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path        TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reference_boards (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_references (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  board_id      TEXT REFERENCES reference_boards(id) ON DELETE SET NULL,
  title         TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  likes         TEXT NOT NULL DEFAULT '',
  avoid         TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  storage_path  TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_decisions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision      TEXT NOT NULL DEFAULT '',
  rationale     TEXT NOT NULL DEFAULT '',
  area          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'current',
  supersedes_id TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitors (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Campaigns & content ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  objective   TEXT NOT NULL DEFAULT '',
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'planning',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_id      TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  title            TEXT NOT NULL DEFAULT '',
  platform         TEXT NOT NULL DEFAULT 'instagram',
  format           TEXT NOT NULL DEFAULT 'post',
  publication_date DATE,
  status           TEXT NOT NULL DEFAULT 'idea',
  caption          TEXT NOT NULL DEFAULT '',
  hashtags         TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  design_id        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Designs ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS designs (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_id         TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  title               TEXT NOT NULL DEFAULT '',
  template            TEXT NOT NULL DEFAULT 'document',
  kind                TEXT NOT NULL DEFAULT 'single',
  status              TEXT NOT NULL DEFAULT 'draft',
  number              TEXT NOT NULL DEFAULT '',
  base_id             TEXT NOT NULL DEFAULT '',
  export_kind         TEXT NOT NULL DEFAULT 'jpg',
  duration_ms         INT NOT NULL DEFAULT 0,
  variant_of          TEXT,
  variant_label       TEXT,
  export_slug         TEXT,
  document            JSONB,
  design_state        JSONB NOT NULL DEFAULT '{}',
  reference_post_ids  JSONB NOT NULL DEFAULT '[]',
  slides              JSONB,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_versions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  design_id      TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  document       JSONB,
  design_state   JSONB NOT NULL DEFAULT '{}',
  label          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (design_id, version_number)
);

CREATE TABLE IF NOT EXISTS design_templates (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  document    JSONB,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Feeds ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feeds (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT 'Feed',
  view_mode   TEXT NOT NULL DEFAULT 'feed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_items (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  feed_id   TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  position  INT NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (feed_id, design_id)
);

-- ── Assets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assets (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'other',
  name         TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  public_url   TEXT NOT NULL DEFAULT '',
  mime_type    TEXT,
  width        INT,
  height       INT,
  file_size    INT,
  tags         JSONB NOT NULL DEFAULT '[]',
  category     TEXT NOT NULL DEFAULT 'misc',
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ops entities (preserved) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverables (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phases (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_links (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspirations (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ideas (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idea_nodes (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS idea_edges (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Workspace meta (migration marker, counters) ─────────────────────────────

CREATE TABLE IF NOT EXISTS workspace_meta (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_designs_project ON designs(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_feed ON feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_sources_project ON project_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_content_project ON content_items(project_id);
CREATE INDEX IF NOT EXISTS idx_design_versions_design ON design_versions(design_id);

-- ── Storage buckets (run separately in dashboard if needed) ───────────────────
-- brand-assets, project-assets, design-assets, exports
-- Configure public read; uploads via server API route with service role.
