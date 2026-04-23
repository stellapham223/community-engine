// Phrases the mention monitor searches across communities.
// Updated periodically as Joy's positioning evolves.

// Brand mentions — anyone says these = potential intel/social proof
export const BRAND_PHRASES = [
  'joy subscriptions',
  'joy subscription app',
  'joy subs',
  'joysubscription',
];

// Competitor-compare contexts — overlap with main monitor but useful as intel,
// especially when paired with sentiment cues (deferred — Stella eyeballs).
export const COMPARE_PHRASES = [
  'recharge alternative',
  'appstle alternative',
  'subscription app comparison',
];

// Shopify-context anchors — required co-occurrence to filter out unrelated industries
// (mobile recharge, SaaS analytics, holiday "joy", etc.)
export const SHOPIFY_ANCHORS = ['shopify', 'merchant', 'd2c', 'ecommerce', 'e-commerce', 'store owner', 'app store'];

// Subscription-context anchors — for compare phrases that overlap with mobile/utility
export const SUBSCRIPTION_ANCHORS = ['subscription box', 'recurring billing', 'subscription business', 'subscribers', 'churn', 'mrr'];

/**
 * Build dynamic team handle phrases from cd_team_accounts rows.
 */
export function buildHandlePhrases(teamAccounts) {
  const out = [];
  for (const a of teamAccounts) {
    if (!a.active) continue;
    if (a.platform === 'reddit') {
      out.push({phrase: `u/${a.username}`, username: a.username, platform: 'reddit'});
      out.push({phrase: `/u/${a.username}`, username: a.username, platform: 'reddit'});
    } else if (a.platform === 'shopify_community') {
      out.push({phrase: `@${a.username}`, username: a.username, platform: 'shopify_community'});
    }
  }
  return out;
}

/**
 * Strict disambiguation. Returns true only if:
 * 1. The EXACT matched phrase appears as a substring in title or body (Reddit keyword
 *    search is fuzzy and returns hits where words appear separately).
 * 2. AND for brand phrases: requires Shopify anchor co-occurrence (filters "joy" the
 *    name/holiday matched alongside "subs"-prefixed words).
 * 3. AND for compare phrases: requires subscription/Shopify anchor (filters mobile
 *    recharge, utility services, etc.).
 */
export function isLikelyMention(thread, matchedPhrase, mentionType) {
  const phraseLower = matchedPhrase.toLowerCase();
  const title = (thread.title || '').toLowerCase();
  const body = (thread.body || '').toLowerCase();
  const text = `${title} ${body}`;

  // Hard requirement: exact substring match
  if (!text.includes(phraseLower)) return false;

  // Brand phrases starting with "joy " need Shopify context to be real
  if (mentionType === 'brand_mention' && phraseLower.startsWith('joy')) {
    return SHOPIFY_ANCHORS.some(a => text.includes(a)) ||
           SUBSCRIPTION_ANCHORS.some(a => text.includes(a));
  }

  // Compare phrases need Shopify or subscription context
  if (mentionType === 'competitor_compare') {
    return SHOPIFY_ANCHORS.some(a => text.includes(a)) ||
           SUBSCRIPTION_ANCHORS.some(a => text.includes(a));
  }

  // Team handle mentions are inherently unique, accept exact match
  return true;
}
