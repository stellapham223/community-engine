-- Joy Community Engagement Engine — Neon Postgres Schema
-- Run: psql $NEON_DATABASE_URL -f db/schema.sql

-- Topic monitoring config (keyword-based rules)
CREATE TABLE IF NOT EXISTS cd_topics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  keywords TEXT[] NOT NULL,
  exclude_keywords TEXT[],
  subreddits TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered threads from community platforms
CREATE TABLE IF NOT EXISTS cd_threads (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  body TEXT,
  author TEXT,
  posted_at TIMESTAMPTZ,
  topic_id INTEGER REFERENCES cd_topics(id) ON DELETE SET NULL,
  matched_keywords TEXT[],
  relevance_score INTEGER,
  relevance_reasoning TEXT,
  status TEXT DEFAULT 'new',
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_threads_status ON cd_threads(status, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_platform ON cd_threads(platform, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_score ON cd_threads(relevance_score DESC NULLS LAST);

-- Comment suggestions per thread (generated on-demand, not in cron)
CREATE TABLE IF NOT EXISTS cd_suggestions (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES cd_threads(id) ON DELETE CASCADE,
  draft_number INTEGER NOT NULL,
  tone TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  mentions_joy BOOLEAN NOT NULL DEFAULT false,
  mentions_competitors TEXT[],
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_thread ON cd_suggestions(thread_id);

-- Engagement tracking — Stella marks threads she posted on
CREATE TABLE IF NOT EXISTS cd_engagements (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES cd_threads(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES cd_suggestions(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  posted_by TEXT,
  initial_metrics JSONB,
  followup_metrics JSONB,
  notes TEXT
);

-- Daily digest history
CREATE TABLE IF NOT EXISTS cd_daily_digests (
  id SERIAL PRIMARY KEY,
  digest_date DATE UNIQUE NOT NULL,
  threads_scanned INTEGER,
  threads_filtered_in INTEGER,
  platforms_breakdown JSONB,
  slack_message_ts TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
