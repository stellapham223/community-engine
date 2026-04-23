// Rule-based keyword filter — runs BEFORE LLM scoring (no API cost)
// Decides whether a thread is worth surfacing to Stella for review

// Stop words — words too common to match standalone
const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'on', 'with', 'to', 'of', 'in', 'is', 'are', 'be', 'best', 'good']);

// Domain anchor — thread MUST contain at least one of these to even be considered
export const DOMAIN_ANCHORS = ['subscription', 'subscribe', 'recurring', 'subscriber'];

function tokenize(text) {
  return text.toLowerCase().match(/[a-z]+/g) || [];
}

function matchesKeywordTokens(haystackTokens, keyword) {
  // Tokenize keyword → must contain ALL non-stop-word tokens (any order)
  const kwTokens = tokenize(keyword).filter(t => !STOP_WORDS.has(t) && t.length > 2);
  if (kwTokens.length === 0) return false;

  const hayset = new Set(haystackTokens);
  return kwTokens.every(t => hayset.has(t));
}

/**
 * Filter a thread against topic keyword rules.
 * @param {object} thread - normalized thread { title, body, metadata, ... }
 * @param {Array} topics - list of cd_topics rows
 * @returns {object|null} { topic_id, matched_keywords } if passes, null if filtered out
 */
export function filterThread(thread, topics) {
  const text = `${thread.title || ''}\n${thread.body || ''}`;
  const lower = text.toLowerCase();
  const tokens = tokenize(text);

  // Hard NSFW / spam exclusion
  const globalExclude = ['nsfw', 'porn', 'crypto pump', 'shitcoin', 'mlm scheme', 'onlyfans'];
  if (globalExclude.some(kw => lower.includes(kw))) return null;

  // Domain anchor — must mention subscription/recurring concepts somewhere
  if (!DOMAIN_ANCHORS.some(anchor => tokens.includes(anchor))) return null;

  for (const topic of topics) {
    if (topic.platforms && !topic.platforms.includes(thread.platform)) continue;

    // Subreddit filter (Reddit only)
    if (thread.platform === 'reddit' && topic.subreddits?.length > 0) {
      const sub = thread.metadata?.subreddit?.toLowerCase();
      if (!sub || !topic.subreddits.map(s => s.toLowerCase()).includes(sub)) continue;
    }

    // Per-topic exclude
    if (topic.exclude_keywords?.some(kw => lower.includes(kw.toLowerCase()))) continue;

    // Match keywords — token-based (any keyword whose tokens all appear)
    const matched = topic.keywords.filter(kw => matchesKeywordTokens(tokens, kw));
    if (matched.length === 0) continue;

    return {topic_id: topic.id, matched_keywords: matched};
  }

  return null;
}

/**
 * Quality filter — drop threads that are too low-engagement to bother
 */
export function isWorthEngaging(thread) {
  const meta = thread.metadata || {};

  if (thread.platform === 'reddit') {
    if (meta.removed) return false;
    if (meta.upvotes != null && meta.upvotes < 2) return false;
    if (meta.num_comments != null && meta.num_comments > 30) return false; // late to engage
    return true;
  }

  if (thread.platform === 'shopify_community') {
    // Skip dead threads with no engagement, but allow new posts
    return true;
  }

  return true;
}
