// Run the community monitor cron logic ONCE locally — bypasses Inngest plumbing.
// Useful for testing scrape → filter → save → Slack flow without dev servers.
// Usage: node --env-file=.env.local scripts/run-cron-once.js

import {sql} from '../db/client.js';
import {searchSubreddit} from '../platforms/reddit.js';
import {searchShopifyCommunity} from '../platforms/shopifyCommunity.js';
import {filterThread, isWorthEngaging} from '../services/keywordFilter.js';
import {computeFreshness} from '../services/freshness.js';
import {buildDigest} from '../services/digestBuilder.js';
import {sendSlack} from '../notifier/slack.js';

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Joy Community Monitor — Local Run');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Load topics
  const topics = await sql`SELECT * FROM cd_topics WHERE is_active = true`;
  console.log(`✓ Loaded ${topics.length} active topics\n`);

  // 2. Scrape Reddit via RSS (no OAuth needed)
  console.log('→ Scraping Reddit (RSS)...');
  const redditThreads = [];
  const seenReddit = new Set();
  for (const topic of topics) {
    if (!topic.platforms.includes('reddit')) continue;
    const subs = topic.subreddits || ['shopify'];
    for (const sub of subs) {
      for (const kw of topic.keywords) {
        try {
          const posts = await searchSubreddit(sub, kw, {limit: 5, timeRange: 'week'});
          for (const p of posts) {
            if (seenReddit.has(p.external_id)) continue;
            seenReddit.add(p.external_id);
            redditThreads.push(p);
          }
        } catch (e) {
          console.error(`  ⚠ ${sub}/${kw}: ${e.message}`);
        }
      }
    }
  }
  console.log(`  Got ${redditThreads.length} Reddit threads\n`);

  // 3. Scrape Shopify Community
  console.log('→ Scraping Shopify Community...');
  const shopifyThreads = [];
  const seenShopify = new Set();
  for (const topic of topics) {
    if (!topic.platforms.includes('shopify_community')) continue;
    for (const kw of topic.keywords) {
      try {
        const posts = await searchShopifyCommunity(kw, {limit: 5});
        for (const p of posts) {
          if (seenShopify.has(p.external_id)) continue;
          seenShopify.add(p.external_id);
          shopifyThreads.push(p);
        }
      } catch (e) {
        console.error(`  ⚠ ${kw}: ${e.message}`);
      }
    }
  }
  console.log(`  Got ${shopifyThreads.length} Shopify Community threads\n`);

  const allRaw = [...redditThreads, ...shopifyThreads];

  // 4. Filter
  console.log('→ Filtering...');
  const filtered = [];
  for (const t of allRaw) {
    if (!isWorthEngaging(t)) continue;
    const match = filterThread(t, topics);
    if (!match) continue;
    filtered.push({...t, ...match});
  }
  console.log(`  ${filtered.length}/${allRaw.length} passed filter\n`);

  // 5. Persist new threads
  console.log('→ Persisting to Neon...');
  const persisted = [];
  for (const t of filtered) {
    try {
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
      if (result[0]) persisted.push(result[0]);
    } catch (e) {
      console.error(`  ⚠ insert failed: ${e.message}`);
    }
  }
  console.log(`  ${persisted.length} new threads saved (${filtered.length - persisted.length} duplicates skipped)\n`);

  // 6. Slack digest
  console.log('→ Sending Slack digest...');
  if (persisted.length === 0) {
    await sendSlack(`🌐 *Joy Community Engagement — ${new Date().toISOString().slice(0, 10)}*\n\nNo new threads today. Scanned ${allRaw.length}, all already in DB or filtered out.`);
    console.log('  ✓ Sent "no new threads" message\n');
  } else {
    const digest = buildDigest({threads: persisted, scanned: allRaw.length, date: new Date()});
    await sendSlack(digest);
    await sql`
      INSERT INTO cd_daily_digests (digest_date, threads_scanned, threads_filtered_in, platforms_breakdown, sent_at)
      VALUES (CURRENT_DATE, ${allRaw.length}, ${persisted.length},
              ${JSON.stringify({reddit: redditThreads.length, shopify_community: shopifyThreads.length})}, NOW())
      ON CONFLICT (digest_date) DO UPDATE SET
        threads_scanned = EXCLUDED.threads_scanned,
        threads_filtered_in = EXCLUDED.threads_filtered_in,
        platforms_breakdown = EXCLUDED.platforms_breakdown,
        sent_at = NOW()
    `;
    console.log(`  ✓ Sent digest with ${persisted.length} threads\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Done.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
