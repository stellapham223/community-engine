-- 002 — Compound automation layer
-- Adds: freshness scoring on threads, mention monitor table,
-- team accounts + karma snapshots, giveback threads, revisit alerts.
-- Idempotent: safe to re-run.

-- Phase 1: freshness columns on threads
ALTER TABLE cd_threads ADD COLUMN IF NOT EXISTS freshness_score INTEGER;
ALTER TABLE cd_threads ADD COLUMN IF NOT EXISTS freshness_band TEXT;

CREATE INDEX IF NOT EXISTS idx_threads_freshness ON cd_threads(freshness_band, freshness_score DESC);

-- Phase 1: organic mention monitoring
CREATE TABLE IF NOT EXISTS cd_mentions (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  body TEXT,
  author TEXT,
  posted_at TIMESTAMPTZ,
  mention_type TEXT,
  matched_phrase TEXT,
  is_first_party BOOLEAN DEFAULT false,
  sentiment TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_notes TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_mentions_acknowledged ON cd_mentions(acknowledged, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_type ON cd_mentions(mention_type, discovered_at DESC);

-- Phase 2: team accounts (Stella + Philip + CS team etc.)
CREATE TABLE IF NOT EXISTS cd_team_accounts (
  id SERIAL PRIMARY KEY,
  person_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_team_accounts_active ON cd_team_accounts(platform, active);

-- Phase 2: daily karma snapshots
CREATE TABLE IF NOT EXISTS cd_karma_snapshots (
  id SERIAL PRIMARY KEY,
  team_account_id INTEGER NOT NULL REFERENCES cd_team_accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  link_karma INTEGER,
  comment_karma INTEGER,
  total_karma INTEGER,
  trust_level INTEGER,
  account_age_days INTEGER,
  raw JSONB,
  UNIQUE(team_account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_karma_account_date ON cd_karma_snapshots(team_account_id, snapshot_date DESC);

-- Phase 2: tone classification + attribution on engagements
ALTER TABLE cd_engagements ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE cd_engagements ADD COLUMN IF NOT EXISTS team_account_id INTEGER REFERENCES cd_team_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_tone ON cd_engagements(tone, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagements_team_account ON cd_engagements(team_account_id, posted_at DESC);

-- Phase 3: give-first karma threads (non-subscription)
CREATE TABLE IF NOT EXISTS cd_giveback_threads (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  body TEXT,
  posted_at TIMESTAMPTZ,
  category TEXT,
  difficulty TEXT,
  upvotes INTEGER,
  num_replies INTEGER,
  status TEXT DEFAULT 'new',
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_giveback_status ON cd_giveback_threads(status, discovered_at DESC);

-- Phase 3: weekly evergreen revisit alerts
CREATE TABLE IF NOT EXISTS cd_revisit_alerts (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES cd_threads(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_revisit_unresolved ON cd_revisit_alerts(resolved, created_at DESC);
