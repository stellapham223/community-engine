# Joy Community Engine — Cách dùng

Hệ thống automate community engagement cho Joy Subscriptions (AEO authority builder). Mục tiêu: lift HubSpot ChatGPT AEO Score 41 → 55+ trong 12 tuần qua organic presence trên Reddit + Shopify Community.

**Tone constraint quan trọng:** Comments PHẢI helpful-first, honest, có thể KHÔNG mention Joy nếu không relevant. Không sales pitch. Disclose "Stella from Joy Subscriptions". 70/30 ratio (helpful:pitch).

---

## 1. Quick start (5 min)

### One-time setup

```bash
cd ~/Desktop/joy-community-engine

# Apply DB migrations (đã chạy rồi nhưng nếu reset DB):
psql $NEON_DATABASE_URL -f db/schema.sql
psql $NEON_DATABASE_URL -f db/migrations/002_compound_automation.sql

# Seed initial topics (subscription monitoring keywords)
node --env-file=.env.local db/seed-topics.js

# Seed team accounts — REQUIRED for karma + ratio tracking
# Add to .env.local:
#   TEAM_ACCOUNTS_REDDIT="stella=stella-joy:primary,philip=philip-avada"
#   TEAM_ACCOUNTS_SHOPIFY="stella=Stella_Joy:primary"
node --env-file=.env.local db/seed-team-accounts.js

# Start dashboard
yarn dev
# → http://localhost:3002
```

### Daily check (Stella, 15-20 min)

1. **Sáng (sau khi nhận Slack digest):** Mở [/](http://localhost:3002/) Dashboard → review hot/warm threads
2. **Click thread** → đọc context → quyết định: engage hay skip
3. **Nếu engage:** Open Claude Code → `Phân tích thread #N` → Claude generate 3 drafts
4. **Pick 1 draft** → post manually trên Reddit/Shopify Community
5. **Quay lại dashboard** → click thread → "I posted this" → chọn `tone`
6. **Kiểm tra:** [/giveback](http://localhost:3002/giveback) — answer 1-2 non-subscription questions để build karma
7. **Kiểm tra:** [/mentions](http://localhost:3002/mentions) — ai đó mention Joy? Acknowledge + thank-you

---

## 2. Dashboard pages

Dev server: `localhost:3002`. Nav top bar có 7 trang.

### [/](http://localhost:3002/) Today
Threads từ scrape pipeline (Reddit + Shopify Community). Default view = "Active" (ẩn skipped).

**Filters:** Active / Drafts ready / New / Engaged / Skipped / All + per-platform.
**Freshness pills:** 🔥 Hot (Reddit <24h, Shopify <2d) — engage trước; 🌤 Warm (1-7d); ❄️ Cold (>7d, late to engage).
**Pitch ratio meter:** 30-day rolling. Bar chuyển đỏ nếu vượt 30% threshold.
**Batch prompt button:** Generate prompt để paste vào Claude Code, MCP tools sẽ analyze + draft cho nhiều threads cùng lúc.

### [/mentions](http://localhost:3002/mentions) Mentions
Khi ai đó mention "Joy Subscriptions" hoặc team handle (u/stella-joy) trong Reddit/Shopify Community.

**Lọc:** Unacknowledged (default) / All. By time: 7d / 30d / 90d.
**3 loại:** 💬 brand_mention · ⚔️ competitor_compare · 👤 team_handle_mention.
**Action:** Click "Ack" sau khi đã thank-you / followed up.

> **Note:** Hiện tại 0 mentions = expected (baseline AEO score thấp). Khi mention đầu tiên xuất hiện = first social proof signal.

### [/giveback](http://localhost:3002/giveback) Karma threads
Non-subscription questions trên r/shopify, r/ecommerce, r/SmallBusiness. Trả lời để build karma + recognition (cần để post sau này không bị nghi sales).

**Filters:** To answer / Answered / Skipped + by category (shipping, theme, apps_general, payment, discount, inventory, marketing, seo, other).
**Actions:** "Answered" (đã trả lời) hoặc "Skip" (không phù hợp).

**Target:** 5-10 answers/tuần để đạt 100+ Reddit karma trong 4-6 tuần.

### [/revisit](http://localhost:3002/revisit) Revisit alerts
Threads Stella đã engage có new replies / gained traction / follow-up question. Cron chạy thứ 2 hàng tuần.

**3 loại alert:**
- 💬 New reply: replies count tăng so với lần check trước
- 📈 Gained traction: upvotes tăng ≥2x
- ❓ Follow-up question: latest reply có dấu `?`

**Action:** "Resolve" sau khi đã follow-up.

### [/reputation](http://localhost:3002/reputation) Team reputation
Karma trends per account (Reddit) + trust level (Shopify Community). 90-day sparkline.

**Reddit threshold:** 100 karma — sau ngưỡng này, post không bị filter mạnh nữa. Badge "100+ karma ✓" hiển thị khi đạt.

### [/stats](http://localhost:3002/stats) Stats
Thread totals, engagement rate per platform/per person, top competitors mentioned trong period.

### [/topics](http://localhost:3002/topics) Topics
Monitored keyword config — xem topics nào đang active, keywords/subreddits của mỗi topic.

---

## 3. MCP tools cho Claude Code

Mở Claude Code trong bất kỳ folder nào (MCP server đã register globally). Hỏi natural language, Claude sẽ gọi tool tương ứng.

### Daily workflow tools

| Tool | Khi nào dùng | Ví dụ prompt |
|------|--------------|--------------|
| `community_today` | Check threads hôm nay | "Cho tôi xem community threads hôm nay" |
| `community_get_thread` | Đọc full content trước khi engage | "Đọc thread #42" |
| `community_analyze_thread` | Generate score + 3 drafts (heavy) | "Phân tích thread #42 và viết drafts" |
| `community_save_suggestions` | Save drafts Claude đã gen | (auto sau analyze) |
| `community_mark_engaged` | Sau khi đã post manually | "Đánh dấu thread #42 đã engage với draft 2, tone helpful_with_joy_mention" |

### Compound automation tools

| Tool | Mục đích | Ví dụ prompt |
|------|----------|--------------|
| `community_mentions` | List organic mentions | "Có ai mention Joy tuần này không?" |
| `community_acknowledge_mention` | Mark mention đã xử lý | "Acknowledge mention #5 với note 'thanked u/foo'" |
| `community_ratio` | Check pitch ratio hiện tại | "Pitch ratio của tôi 30 ngày qua thế nào?" |
| `community_giveback_today` | List karma threads | "Cho tôi karma threads category=shipping" |
| `community_giveback_mark_answered` | Đánh dấu đã trả lời | "Mark giveback #12 answered" |
| `community_revisit_alerts` | Engaged threads có new replies | "Có alerts revisit nào unresolved không?" |
| `community_top_competitors` | Top competitors mentioned | "Top competitor 7 ngày qua?" |
| `community_engagement_stats` | Engagement metrics | "Stats engagement tháng này" |
| `community_topics_update` | Add/remove keywords | "Thêm keyword 'Subbly alternative' vào monitoring" |

### Tone enum (REQUIRED khi mark_engaged)

- `helpful_only` — KHÔNG mention Joy. Chỉ trả lời câu hỏi. Counts as helpful (good cho ratio).
- `helpful_with_joy_mention` — Help first, mention Joy 1 lần nếu relevant. Counts as PITCH (consume 30% budget).
- `recommend_alternatives` — Recommend competitor honestly nếu họ fit hơn. Counts as helpful.

> **Tip:** Pitch ratio breach = warning Slack tự động + bar đỏ trên dashboard. Nếu thấy warning, 2-3 posts kế tiếp PHẢI là `helpful_only` hoặc `recommend_alternatives`.

---

## 4. Slack alerts (channel default từ env `SLACK_CHANNEL_ID`)

5 loại notification:

| Alert | Khi nào | Format |
|-------|---------|--------|
| 🌐 Daily digest | 1am UTC mỗi ngày | Top threads sorted hot→cold, link click vào dashboard |
| 🎯 Organic mention | Mỗi 6h khi có mention mới | Author + matched phrase + link |
| 🎁 Karma threads | 3am UTC mỗi ngày | Top 8 non-subscription questions |
| 🔁 Revisit digest | Thứ 2 4am UTC mỗi tuần | Threads với new replies / traction |
| ⚠️ Pitch ratio breach | Real-time khi mark_engaged vượt 30% | Cảnh báo skip pitch 2-3 posts kế tiếp |

---

## 5. Admin / dev operations

### Run cron jobs locally (test mode, bypass Inngest)

```bash
# Main scrape pipeline
node --env-file=.env.local scripts/run-cron-once.js

# Mention monitor
node --env-file=.env.local scripts/run-mention-monitor.js

# Karma snapshot (cần team accounts seeded)
node --env-file=.env.local scripts/run-karma-snapshot.js

# Giveback discovery
node --env-file=.env.local scripts/run-giveback-discovery.js

# Evergreen revisit (cần engaged threads)
node --env-file=.env.local scripts/run-evergreen-revisit.js

# Backfill freshness for existing threads (one-time)
node --env-file=.env.local scripts/backfill-freshness.js
```

### Add/remove monitored keywords

**Option 1 (UI):** Edit `db/seed-topics.js` → re-run seed. WARN: overwrites topic config.
**Option 2 (Claude Code):**
```
"Thêm keyword 'Loop alternative' vào topic Competitor Refugees"
```
→ Claude calls `community_topics_update`.
**Option 3 (SQL):**
```sql
UPDATE cd_topics SET keywords = array_append(keywords, 'new keyword')
WHERE name = 'Topic Name';
```

### Required environment variables (`.env.local`)

```bash
# Database
NEON_DATABASE_URL=postgresql://...

# Slack (Bot API, không phải webhook)
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0xxx...

# Inngest (production deploy)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Team accounts (Phase 2 — karma + ratio attribution)
TEAM_ACCOUNTS_REDDIT="stella=stella-joy:primary,philip=philip-avada"
TEAM_ACCOUNTS_SHOPIFY="stella=Stella_Joy:primary"
```

### Production deploy

```bash
# 1. Push to Vercel (project: joy-community-engine)
vercel deploy --prod

# 2. Register Inngest functions với webhook URL
# Vào Inngest dashboard → Apps → Add app → URL:
# https://joy-community-engine.vercel.app/api/inngest

# 3. Verify crons listed in Inngest dashboard
```

---

## 6. Troubleshooting

| Vấn đề | Nguyên nhân thường gặp | Fix |
|--------|------------------------|-----|
| Dashboard hiển thị 0 threads | Cache stale | `rm -rf .next && yarn dev` |
| MCP tools "Failed to connect" | DB client load trước env | Restart Claude Code (kill MCP processes) |
| Mention monitor 0 hits dù có brand mention | False negative do strict filter | Test phrase manually trên Reddit search; nếu legitimate, relax `isLikelyMention` trong `services/mentionPhrases.js` |
| Slack không nhận message | Bot token expired hoặc bot chưa được invite vào channel | Check `SLACK_BOT_TOKEN` valid + invite bot vào channel |
| Karma snapshot 404 | Username typo hoặc account suspended | Check `cd_team_accounts.username` chính xác (không có `u/` prefix) |
| Reddit RSS rate limited | Quá nhiều requests | RSS có 1.5s sleep built-in. Nếu 429, tăng sleep trong `platforms/reddit.js` |
| Shopify Community 5xx | Discourse rate limit | Tăng sleep từ 5s lên 8s trong `platforms/shopifyCommunity.js` |
| Filter quá strict (4% match rate) | Domain anchor + token strict | Edit `services/keywordFilter.js` — relax `DOMAIN_ANCHORS` hoặc thêm vào keyword list |
| Pitch ratio meter empty | Engagements chưa có `tone` | Mới: tone REQUIRED khi mark_engaged. Old engagements = unclassified, không count |

---

## 7. Daily workflow checklist (Stella, 15-20 min)

```
[ ] Mở Slack — check daily digest (1am UTC)
[ ] Mở /                      — review hot threads (15 min)
    [ ] Click 3-5 threads relevant
    [ ] Skip threads cold + low-relevance
    [ ] Click "Generate drafts" cho threads engage
[ ] Mở Claude Code — paste prompt từ batch button
    [ ] Pick best draft per thread
    [ ] Edit câu mở/đóng để personal hơn
[ ] Post manually trên Reddit / Shopify Community
[ ] Back to dashboard — mark engaged + chọn tone
[ ] Mở /giveback              — answer 1-2 karma threads (5 min)
[ ] Mở /mentions              — ack new mentions if any
[ ] Mở /revisit (thứ 2)        — follow-up engaged threads với new replies
```

**Weekly:**
- [ ] Check /reputation — karma trend
- [ ] Check /stats — engagement rate
- [ ] Review pitch ratio meter — adjust nếu drift quá 30%

**Monthly:**
- [ ] Re-run HubSpot AEO Grader — track ChatGPT score progress
- [ ] Review top competitor mentions — adjust positioning nếu cần
- [ ] Update topics nếu phát hiện trending keywords mới

---

## 8. Architecture cheat-sheet

```
Inngest crons (5 jobs)
├─ 0 1 * * *   communityMonitorDaily  → cd_threads → Slack digest
├─ 0 */6 * * * mentionMonitor          → cd_mentions → Slack alert
├─ 0 2 * * *   karmaSnapshotDaily      → cd_karma_snapshots
├─ 0 3 * * *   givebackDiscoveryDaily  → cd_giveback_threads → Slack
└─ 0 4 * * 1   evergreenRevisitWeekly  → cd_revisit_alerts → Slack

Neon Postgres (8 tables)
├─ cd_topics            (keyword config)
├─ cd_threads           (subscription threads)
├─ cd_suggestions       (drafts per thread)
├─ cd_engagements       (Stella's posts, with tone)
├─ cd_daily_digests     (digest history)
├─ cd_mentions          (organic mentions)
├─ cd_team_accounts     (Stella + team)
├─ cd_karma_snapshots   (daily karma)
├─ cd_giveback_threads  (karma-building threads)
└─ cd_revisit_alerts    (revisit alerts)

Next.js dashboard (port 3002)
├─ /              Today
├─ /mentions      Organic mentions
├─ /giveback      Karma threads
├─ /revisit       Revisit alerts
├─ /reputation    Team karma trends
├─ /stats         Engagement metrics
└─ /topics        Monitoring config

MCP server (13 tools, accessible from Claude Code)
```
