# Joy Community Engine

Daily community monitoring + on-demand comment suggestions for Joy Subscriptions AEO.

**Plan reference:** `~/subscriptions/product-team/marketing/marketing/aeo/community-engagement-plan.md`

## What it does

1. **Daily cron (8am HCM)** scrapes Reddit + Shopify Community for threads matching Joy's monitored keywords
2. **Filters** by topic rules (no LLM cost) → persists to Neon Postgres
3. **Slack digest** sent to marketing channel with thread links
4. **On-demand**: Stella opens Claude Code, asks `Analyze thread #N`, MCP tool generates 3 honest comment drafts (LLM happens in session, not in cron)
5. Stella reviews + posts manually on platforms (no auto-posting)

## Stack

- **Cron:** Inngest (replaces Firebase Cloud Scheduler)
- **DB:** Neon Postgres serverless
- **Deploy:** Vercel
- **Scrapers:** Reddit OAuth + Shopify Community (cheerio)
- **LLM (on-demand only):** Anthropic Claude via MCP tools

## Setup

```bash
# 1. Install deps
npm install

# 2. Copy env template
cp .env.local.example .env.local
# Fill: NEON_DATABASE_URL, REDDIT_CLIENT_ID/SECRET, SLACK_WEBHOOK_URL

# 3. Init Neon DB (run schema migration)
psql $NEON_DATABASE_URL -f db/schema.sql

# 4. Seed initial monitoring topics
node db/seed-topics.js

# 5. Run Inngest dev server (in 1 terminal)
npm run inngest:dev

# 6. Run Vercel dev (in another terminal)
npm run dev

# 7. Trigger cron from Inngest dashboard (http://localhost:8288)
```

## Production deploy

```bash
# Set env vars on Vercel dashboard
vercel env add NEON_DATABASE_URL
vercel env add REDDIT_CLIENT_ID
vercel env add REDDIT_CLIENT_SECRET
vercel env add SLACK_WEBHOOK_URL
vercel env add ANTHROPIC_API_KEY
vercel env add INNGEST_EVENT_KEY
vercel env add INNGEST_SIGNING_KEY

# Deploy
vercel --prod

# Register Inngest endpoint in Inngest dashboard:
#   App URL: https://joy-community-engine.vercel.app/api/inngest
```

## Project structure

```
joy-community-engine/
├── api/inngest.js                # Vercel API route — Inngest webhook
├── inngest/
│   ├── client.js                 # Inngest client init
│   └── functions/communityMonitor.js  # Daily cron workflow
├── platforms/
│   ├── reddit.js                 # Reddit OAuth + search
│   └── shopifyCommunity.js       # Shopify Community scraper
├── services/
│   ├── keywordFilter.js          # Rule-based filter (no LLM)
│   ├── digestBuilder.js          # Slack message formatter
│   └── llmPrompts.js             # System prompts (used on-demand by MCP)
├── db/
│   ├── client.js                 # Neon SQL client
│   ├── schema.sql                # Initial tables
│   └── seed-topics.js            # Initial monitoring topics
├── notifier/slack.js             # Slack webhook sender
└── mcp/tools.js                  # MCP tool definitions (week 4)
```

## Topics monitored (seed)

See `db/seed-topics.js`. Edit + re-run to update.

## Testing

```bash
# Test Reddit scraper standalone
node -e "import('./platforms/reddit.js').then(m => m.searchSubreddit('shopify', 'subscription app', {limit: 5}).then(r => console.log(JSON.stringify(r, null, 2))))"

# Test Shopify Community scraper
node -e "import('./platforms/shopifyCommunity.js').then(m => m.searchShopifyCommunity('subscription app', {limit: 5}).then(r => console.log(JSON.stringify(r, null, 2))))"
```
