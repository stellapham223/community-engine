// Run mention monitor logic ONCE locally — bypasses Inngest plumbing.
// Usage: node --env-file=.env.local scripts/run-mention-monitor.js

import {sql} from '../db/client.js';
import {searchSubreddit} from '../platforms/reddit.js';
import {searchShopifyCommunity} from '../platforms/shopifyCommunity.js';
import {sendSlack} from '../notifier/slack.js';
import {
  BRAND_PHRASES,
  COMPARE_PHRASES,
  buildHandlePhrases,
  isLikelyMention,
} from '../services/mentionPhrases.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Mention Monitor — Local Run');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const teamAccounts = await sql`SELECT * FROM cd_team_accounts WHERE active = true`;
console.log(`✓ Loaded ${teamAccounts.length} team accounts\n`);

const usernameSet = new Set(teamAccounts.map(a => a.username.toLowerCase()));
const handlePhrases = buildHandlePhrases(teamAccounts);

const allHits = [];

console.log('→ Brand phrases on Reddit (r/all)...');
for (const phrase of BRAND_PHRASES) {
  try {
    const posts = await searchSubreddit('all', phrase, {limit: 10, timeRange: 'week'});
    console.log(`  "${phrase}": ${posts.length} hits`);
    posts.forEach(p => allHits.push({...p, matched_phrase: phrase, mention_type: 'brand_mention'}));
  } catch (e) {
    console.error(`  ⚠ "${phrase}": ${e.message}`);
  }
}

console.log('\n→ Compare phrases on Reddit...');
for (const phrase of COMPARE_PHRASES) {
  try {
    const posts = await searchSubreddit('all', phrase, {limit: 5, timeRange: 'week'});
    console.log(`  "${phrase}": ${posts.length} hits`);
    posts.forEach(p => allHits.push({...p, matched_phrase: phrase, mention_type: 'competitor_compare'}));
  } catch (e) {
    console.error(`  ⚠ "${phrase}": ${e.message}`);
  }
}

console.log('\n→ Brand phrases on Shopify Community...');
for (const phrase of BRAND_PHRASES) {
  try {
    const posts = await searchShopifyCommunity(phrase, {limit: 5});
    console.log(`  "${phrase}": ${posts.length} hits`);
    posts.forEach(p => allHits.push({...p, matched_phrase: phrase, mention_type: 'brand_mention'}));
  } catch (e) {
    console.error(`  ⚠ "${phrase}": ${e.message}`);
  }
}

console.log('\n→ Team handle phrases on Reddit...');
for (const h of handlePhrases.filter(h => h.platform === 'reddit')) {
  try {
    const posts = await searchSubreddit('all', h.phrase, {limit: 10, timeRange: 'week'});
    console.log(`  "${h.phrase}": ${posts.length} hits`);
    posts.forEach(p => allHits.push({...p, matched_phrase: h.phrase, mention_type: 'team_handle_mention'}));
  } catch (e) {
    console.error(`  ⚠ "${h.phrase}": ${e.message}`);
  }
}

console.log(`\n→ Total raw hits: ${allHits.length}`);

const seen = new Set();
const newMentions = [];
for (const m of allHits) {
  if (seen.has(m.external_id)) continue;
  seen.add(m.external_id);

  if (!isLikelyMention(m, m.matched_phrase, m.mention_type)) continue;

  const isFirstParty = m.author && usernameSet.has(m.author.toLowerCase());

  try {
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
    if (result[0]) newMentions.push(result[0]);
  } catch (e) {
    console.error(`  ⚠ insert: ${e.message}`);
  }
}

console.log(`✓ ${newMentions.length} new mentions persisted (${seen.size - newMentions.length} dupes/filtered)\n`);

const alertWorthy = newMentions.filter(m => !m.is_first_party);
if (alertWorthy.length > 0) {
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
  console.log(`→ Alerted Slack with ${alertWorthy.length} non-first-party mentions`);
} else {
  console.log('→ No alert-worthy mentions (all first-party or none new)');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Done.');
process.exit(0);
