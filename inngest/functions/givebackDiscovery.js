// Give-first discovery — daily, scrape r/shopify HOT for non-subscription
// questions Stella can answer to build karma + recognition.

import {inngest} from '../client.js';
import {sql} from '../../db/client.js';
import {fetchSubredditHot} from '../../platforms/reddit.js';
import {filterGivebackThread} from '../../services/givebackFilter.js';
import {sendSlack} from '../../notifier/slack.js';

const SUBS = ['shopify', 'ecommerce', 'SmallBusiness'];

export const givebackDiscoveryDaily = inngest.createFunction(
  {id: 'giveback-discovery-daily', name: 'Give-First Karma Threads — Daily'},
  {cron: '0 3 * * *'}, // 3am UTC
  async ({step}) => {
    const all = await step.run('scrape', async () => {
      const out = [];
      const seen = new Set();
      for (const sub of SUBS) {
        try {
          const posts = await fetchSubredditHot(sub, {limit: 25});
          for (const p of posts) {
            if (seen.has(p.external_id)) continue;
            seen.add(p.external_id);
            out.push(p);
          }
        } catch (e) {
          console.error(`[giveback] r/${sub}:`, e.message);
        }
      }
      return out;
    });

    const filtered = await step.run('filter', async () => {
      return all.map(filterGivebackThread).filter(Boolean);
    });

    const persisted = await step.run('persist', async () => {
      const saved = [];
      for (const t of filtered) {
        const result = await sql`
          INSERT INTO cd_giveback_threads
            (platform, external_id, url, title, body, posted_at, category,
             difficulty, upvotes, num_replies, metadata)
          VALUES
            (${t.platform}, ${t.external_id}, ${t.url}, ${t.title}, ${t.body},
             ${t.posted_at}, ${t.category}, ${t.difficulty}, ${t.upvotes || null},
             ${t.num_replies || 0}, ${JSON.stringify(t.metadata || {})})
          ON CONFLICT (external_id) DO NOTHING
          RETURNING id, title, url, category, difficulty, upvotes, num_replies
        `;
        if (result[0]) saved.push(result[0]);
      }
      return saved;
    });

    await step.run('alert', async () => {
      if (persisted.length === 0) return {sent: false};

      const top = persisted.slice(0, 8);
      let msg = `🎁 *Karma threads — ${persisted.length} quick wins*\n_Non-subscription questions Stella can answer for karma_\n\n`;
      for (const t of top) {
        const cat = t.category !== 'other' ? `[${t.category}] ` : '';
        const ups = t.upvotes != null ? `${t.upvotes} ↑ · ` : '';
        msg += `• ${cat}${t.title?.slice(0, 100)}\n   ${ups}${t.num_replies} replies\n   ${t.url}\n`;
      }
      if (persisted.length > 8) msg += `\n_…${persisted.length - 8} more in /giveback dashboard_`;
      await sendSlack(msg);
      return {sent: true};
    });

    return {scanned: all.length, filtered: filtered.length, persisted: persisted.length};
  },
);
