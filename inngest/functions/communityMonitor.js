// Daily cron — scrapes Reddit + Shopify Community, filters by keywords,
// persists to Neon, sends Slack digest.
// NO LLM in this workflow — drafts generated on-demand via MCP later.

import {inngest} from '../client.js';
import {sql} from '../../db/client.js';
import {searchSubreddit} from '../../platforms/reddit.js';
import {searchShopifyCommunity} from '../../platforms/shopifyCommunity.js';
import {filterThread, isWorthEngaging} from '../../services/keywordFilter.js';
import {computeFreshness} from '../../services/freshness.js';
import {buildDigest} from '../../services/digestBuilder.js';
import {sendSlack} from '../../notifier/slack.js';

export const communityMonitorDaily = inngest.createFunction(
  {id: 'community-monitor-daily', name: 'Community Monitor — Daily'},
  {cron: '0 1 * * *'}, // 1am UTC = 8am Asia/Ho_Chi_Minh
  async ({step}) => {
    // Step 1: Load active topics
    const topics = await step.run('load-topics', async () => {
      return await sql`SELECT * FROM cd_topics WHERE is_active = true`;
    });

    if (topics.length === 0) {
      return {threads: 0, message: 'No active topics — seed cd_topics first'};
    }

    // Step 2: Scrape Reddit (parallelized per subreddit × keyword)
    const redditThreads = await step.run('scrape-reddit', async () => {
      const out = [];
      const seen = new Set();

      for (const topic of topics) {
        if (!topic.platforms.includes('reddit')) continue;
        const subs = topic.subreddits || ['shopify'];

        for (const sub of subs) {
          for (const kw of topic.keywords) {
            try {
              const posts = await searchSubreddit(sub, kw, {limit: 10, timeRange: 'week'});
              for (const p of posts) {
                if (seen.has(p.external_id)) continue;
                seen.add(p.external_id);
                out.push(p);
              }
            } catch (e) {
              console.error(`[reddit] ${sub}/${kw}:`, e.message);
            }
          }
        }
      }
      return out;
    });

    // Step 3: Scrape Shopify Community
    const shopifyThreads = await step.run('scrape-shopify-community', async () => {
      const out = [];
      const seen = new Set();

      for (const topic of topics) {
        if (!topic.platforms.includes('shopify_community')) continue;

        for (const kw of topic.keywords) {
          try {
            const posts = await searchShopifyCommunity(kw, {limit: 10});
            for (const p of posts) {
              if (seen.has(p.external_id)) continue;
              seen.add(p.external_id);
              out.push(p);
            }
          } catch (e) {
            console.error(`[shopify-community] ${kw}:`, e.message);
          }
        }
      }
      return out;
    });

    const allRaw = [...redditThreads, ...shopifyThreads];

    // Step 4: Filter (keyword rules + quality)
    const filtered = await step.run('filter', async () => {
      const passed = [];
      for (const t of allRaw) {
        if (!isWorthEngaging(t)) continue;
        const match = filterThread(t, topics);
        if (!match) continue;
        passed.push({...t, ...match});
      }
      return passed;
    });

    // Step 5: Persist new threads to Neon (with freshness scoring)
    const persisted = await step.run('persist', async () => {
      const saved = [];
      for (const t of filtered) {
        const {score, band} = computeFreshness(t);
        const result = await sql`
          INSERT INTO cd_threads
            (platform, external_id, url, title, body, author, posted_at, topic_id,
             matched_keywords, status, metadata, freshness_score, freshness_band)
          VALUES
            (${t.platform}, ${t.external_id}, ${t.url}, ${t.title}, ${t.body}, ${t.author},
             ${t.posted_at}, ${t.topic_id}, ${t.matched_keywords}, 'new',
             ${JSON.stringify(t.metadata)}, ${score}, ${band})
          ON CONFLICT (external_id) DO NOTHING
          RETURNING id, platform, external_id, title, url, posted_at, metadata,
                    freshness_score, freshness_band
        `;
        if (result[0]) saved.push(result[0]);
      }
      return saved;
    });

    // Step 6: Send Slack digest
    await step.run('send-digest', async () => {
      if (persisted.length === 0) {
        await sendSlack(`🌐 *Joy Community Engagement — ${new Date().toISOString().slice(0, 10)}*\n\nNo new threads today. Scanned ${allRaw.length}, all already in DB or filtered out.`);
        return {sent: false, reason: 'no_new_threads'};
      }

      const digest = buildDigest({
        threads: persisted,
        scanned: allRaw.length,
        date: new Date(),
      });
      await sendSlack(digest);

      // Log digest to history
      await sql`
        INSERT INTO cd_daily_digests (digest_date, threads_scanned, threads_filtered_in, platforms_breakdown, sent_at)
        VALUES (
          CURRENT_DATE,
          ${allRaw.length},
          ${persisted.length},
          ${JSON.stringify({reddit: redditThreads.length, shopify_community: shopifyThreads.length})},
          NOW()
        )
        ON CONFLICT (digest_date) DO UPDATE SET
          threads_scanned = EXCLUDED.threads_scanned,
          threads_filtered_in = EXCLUDED.threads_filtered_in,
          platforms_breakdown = EXCLUDED.platforms_breakdown,
          sent_at = NOW()
      `;
      return {sent: true};
    });

    return {
      scanned: allRaw.length,
      filtered: filtered.length,
      persisted: persisted.length,
    };
  }
);
