// Build Slack daily digest message from filtered threads
// Pure formatting — no LLM, no DB calls

const PLATFORM_LABEL = {
  reddit: 'Reddit',
  shopify_community: 'Shopify Community',
  twitter: 'Twitter',
};

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const FRESHNESS_EMOJI = {hot: '🔥', warm: '🌤', cold: '❄️'};
const BAND_RANK = {hot: 0, warm: 1, cold: 2};

function threadLine(t) {
  const fresh = FRESHNESS_EMOJI[t.freshness_band] || '';
  const subreddit = t.metadata?.subreddit ? `[r/${t.metadata.subreddit}] ` : '';
  const upvotes = t.metadata?.upvotes != null ? `${t.metadata.upvotes} upvotes · ` : '';
  const replies = t.metadata?.num_comments != null
    ? `${t.metadata.num_comments} replies · `
    : (t.metadata?.replies != null ? `${t.metadata.replies} replies · ` : '');
  const time = relativeTime(t.posted_at || t.discovered_at);

  const titleClipped = t.title?.length > 90 ? t.title.slice(0, 87) + '…' : t.title;

  return `• ${fresh} [#${t.id}] ${subreddit}${titleClipped}\n   ${upvotes}${replies}${time}\n   ${t.url}`;
}

/**
 * Build the Slack message body for daily digest.
 * @param {object} input
 * @param {Array} input.threads - filtered threads to include (already passed keyword filter)
 * @param {number} input.scanned - total threads scanned today
 * @param {Date} input.date
 */
export function buildDigest({threads, scanned, date}) {
  const dateStr = date.toISOString().split('T')[0];

  // Sort: hot → warm → cold; within band, newest first.
  const sorted = [...threads].sort((a, b) => {
    const bandDiff = (BAND_RANK[a.freshness_band] ?? 9) - (BAND_RANK[b.freshness_band] ?? 9);
    if (bandDiff !== 0) return bandDiff;
    return new Date(b.posted_at || b.discovered_at) - new Date(a.posted_at || a.discovered_at);
  });

  // Group by platform (preserves freshness order within each)
  const byPlatform = {};
  for (const t of sorted) {
    if (!byPlatform[t.platform]) byPlatform[t.platform] = [];
    byPlatform[t.platform].push(t);
  }

  const sections = Object.entries(byPlatform).map(([platform, list]) => {
    const lines = list.slice(0, 10).map(threadLine).join('\n');
    return `*${PLATFORM_LABEL[platform] || platform} (${list.length}):*\n${lines}`;
  });

  const body = [
    `🌐 *Joy Community Engagement — ${dateStr}*`,
    `Scanned ${scanned} threads. ${threads.length} passed keyword filter.`,
    '',
    ...sections,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '⏰ *To engage:* Open Claude Code → `Analyze thread #N` (use the # ID above)',
    `📊 *Time estimate:* 15-20 min review + 1-2 manual posts`,
  ].join('\n');

  return body;
}
