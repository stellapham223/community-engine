// Mention monitor — every 6h, search Reddit + Shopify Community for brand
// mentions and team handle mentions. Alert Slack on any new third-party mention.

import {inngest} from '../client.js';
import {sql} from '../../db/client.js';
import {searchSubreddit} from '../../platforms/reddit.js';
import {searchShopifyCommunity} from '../../platforms/shopifyCommunity.js';
import {sendSlack} from '../../notifier/slack.js';
import {
  BRAND_PHRASES,
  COMPARE_PHRASES,
  buildHandlePhrases,
  isLikelyMention,
} from '../../services/mentionPhrases.js';

export const mentionMonitor = inngest.createFunction(
  {id: 'mention-monitor', name: 'Community Mention Monitor'},
  {cron: '0 */6 * * *'}, // every 6h
  async ({step}) => {
    const teamAccounts = await step.run('load-team-accounts', async () => {
      return await sql`SELECT * FROM cd_team_accounts WHERE active = true`;
    });

    const usernameSet = new Set(teamAccounts.map(a => a.username.toLowerCase()));
    const handlePhrases = buildHandlePhrases(teamAccounts);

    const allHits = await step.run('scan', async () => {
      const out = [];

      // Brand mentions on Reddit (search r/all)
      for (const phrase of BRAND_PHRASES) {
        try {
          const posts = await searchSubreddit('all', phrase, {limit: 10, timeRange: 'week'});
          for (const p of posts) out.push({...p, matched_phrase: phrase, mention_type: 'brand_mention'});
        } catch (e) {
          console.error(`[mention] reddit/all "${phrase}":`, e.message);
        }
      }

      // Compare-context mentions on Reddit
      for (const phrase of COMPARE_PHRASES) {
        try {
          const posts = await searchSubreddit('all', phrase, {limit: 5, timeRange: 'week'});
          for (const p of posts) out.push({...p, matched_phrase: phrase, mention_type: 'competitor_compare'});
        } catch (e) {
          console.error(`[mention] reddit/all "${phrase}":`, e.message);
        }
      }

      // Brand mentions on Shopify Community
      for (const phrase of BRAND_PHRASES) {
        try {
          const posts = await searchShopifyCommunity(phrase, {limit: 5});
          for (const p of posts) out.push({...p, matched_phrase: phrase, mention_type: 'brand_mention'});
        } catch (e) {
          console.error(`[mention] shopify-comm "${phrase}":`, e.message);
        }
      }

      // Team handle mentions (e.g. u/stella-joy) — Reddit only
      for (const h of handlePhrases.filter(h => h.platform === 'reddit')) {
        try {
          const posts = await searchSubreddit('all', h.phrase, {limit: 10, timeRange: 'week'});
          for (const p of posts) out.push({...p, matched_phrase: h.phrase, mention_type: 'team_handle_mention'});
        } catch (e) {
          console.error(`[mention] reddit/all "${h.phrase}":`, e.message);
        }
      }

      return out;
    });

    // Filter + classify + dedupe
    const newMentions = await step.run('persist', async () => {
      const saved = [];
      const seen = new Set();
      for (const m of allHits) {
        if (seen.has(m.external_id)) continue;
        seen.add(m.external_id);

        // Strict disambiguation — drop fuzzy keyword matches and irrelevant industries
        if (!isLikelyMention(m, m.matched_phrase, m.mention_type)) continue;

        const isFirstParty = m.author && usernameSet.has(m.author.toLowerCase());

        const result = await sql`
          INSERT INTO cd_mentions
            (platform, external_id, url, title, body, author, posted_at,
             mention_type, matched_phrase, is_first_party, metadata)
          VALUES
            (${m.platform}, ${m.external_id}, ${m.url}, ${m.title}, ${m.body},
             ${m.author}, ${m.posted_at}, ${m.mention_type}, ${m.matched_phrase},
             ${isFirstParty}, ${JSON.stringify(m.metadata || {})})
          ON CONFLICT (external_id) DO NOTHING
          RETURNING id, platform, url, title, author, mention_type, matched_phrase, is_first_party
        `;
        if (result[0]) saved.push(result[0]);
      }
      return saved;
    });

    // Alert Slack for non-first-party mentions only
    await step.run('alert', async () => {
      const alertWorthy = newMentions.filter(m => !m.is_first_party);
      if (alertWorthy.length === 0) {
        return {alerted: 0};
      }

      let msg = `🎯 *${alertWorthy.length} organic mention${alertWorthy.length > 1 ? 's' : ''} detected*\n\n`;
      for (const m of alertWorthy.slice(0, 10)) {
        const icon = m.mention_type === 'team_handle_mention' ? '👤' : m.mention_type === 'competitor_compare' ? '⚔️' : '💬';
        const author = m.author ? (m.platform === 'reddit' ? `u/${m.author}` : `@${m.author}`) : 'unknown';
        msg += `${icon} *${m.platform}* · ${author} · _"${m.matched_phrase}"_\n`;
        msg += `   ${m.title?.slice(0, 120) || '(no title)'}\n`;
        msg += `   👉 ${m.url}\n\n`;
      }
      if (alertWorthy.length > 10) msg += `_…and ${alertWorthy.length - 10} more — see /mentions in dashboard_\n`;

      await sendSlack(msg);
      return {alerted: alertWorthy.length};
    });

    return {
      scanned: allHits.length,
      new_mentions: newMentions.length,
      first_party_skipped: newMentions.filter(m => m.is_first_party).length,
    };
  },
);
