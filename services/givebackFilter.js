// Filter + categorize r/shopify HOT threads for "give-first" karma building.
// Goal: surface real questions Stella can answer (NOT subscription-related, to avoid
// duplication with the main pipeline).

import {DOMAIN_ANCHORS} from './keywordFilter.js';

const QUESTION_STARTERS = ['how', 'what', 'why', 'where', 'should', 'need', 'recommend', 'advice', 'best', 'help', 'anyone', 'is there', 'can i', 'looking for'];

const CATEGORY_KEYWORDS = {
  shipping: ['shipping', 'fulfilment', 'fulfillment', 'delivery', 'tracking', 'carrier', 'usps', 'fedex'],
  theme: ['theme', 'template', 'design', 'css', 'liquid', 'customize'],
  apps_general: ['app', 'plugin', 'integration', 'recommend app'],
  payment: ['payment', 'paypal', 'stripe', 'checkout', 'tax', 'currency'],
  discount: ['discount', 'coupon', 'promo', 'sale', 'pricing', 'free shipping'],
  inventory: ['inventory', 'stock', 'sku', 'variant', 'product import'],
  marketing: ['email', 'klaviyo', 'mailchimp', 'sms', 'ads', 'facebook', 'instagram', 'tiktok'],
  seo: ['seo', 'google', 'rank', 'search', 'sitemap'],
};

const EASY_HINTS = ['how do i', 'where do i', 'is there a way', 'simple', 'beginner'];

function isQuestion(title) {
  const t = title.toLowerCase().trim();
  if (t.endsWith('?')) return true;
  return QUESTION_STARTERS.some(s => t.startsWith(s + ' '));
}

function categorize(title, body) {
  const text = `${title} ${body || ''}`.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) return cat;
  }
  return 'other';
}

function difficulty(title, body) {
  const text = `${title} ${body || ''}`.toLowerCase();
  if (EASY_HINTS.some(h => text.includes(h))) return 'easy';
  return 'medium';
}

function isSubscriptionRelated(title, body) {
  const text = `${title} ${body || ''}`.toLowerCase();
  return DOMAIN_ANCHORS.some(a => text.includes(a));
}

/**
 * Filter + categorize a thread for giveback queue.
 * Returns enriched object if eligible, null otherwise.
 */
export function filterGivebackThread(thread) {
  if (!thread.title) return null;
  if (!isQuestion(thread.title)) return null;
  if (isSubscriptionRelated(thread.title, thread.body)) return null;

  const bodyLen = (thread.body || '').length;
  if (bodyLen < 30 || bodyLen > 1500) return null;

  // Quality gate — at least 1 reply means real conversation
  const replies = thread.metadata?.num_comments ?? thread.metadata?.replies ?? 0;
  // Hot feed doesn't always include comment count, so allow 0 if metadata absent

  return {
    ...thread,
    category: categorize(thread.title, thread.body),
    difficulty: difficulty(thread.title, thread.body),
    upvotes: thread.metadata?.upvotes ?? null,
    num_replies: replies,
  };
}
