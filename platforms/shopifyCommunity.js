// Shopify Community is built on Discourse — uses standard /search.json + /t/{id}.json endpoints

const USER_AGENT = 'joy-community-engine/0.1 (+https://joysubscription.com)';
const BASE = 'https://community.shopify.com';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Search Shopify Community via Discourse JSON API.
 * @param {string} query
 * @param {object} options
 * @param {number} options.limit - max posts to return (default 25)
 * @returns {Promise<Array>}
 */
export async function searchShopifyCommunity(query, {limit = 25} = {}) {
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set('q', query);
  url.searchParams.set('page', '1');

  await sleep(5000);

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify Community search failed: ${res.status}`);
  }

  const data = await res.json();
  const topics = data.topics || [];
  return topics.slice(0, limit).map(normalizeTopic);
}

function normalizeTopic(topic) {
  const slug = topic.slug || `topic-${topic.id}`;
  return {
    platform: 'shopify_community',
    external_id: `shopifycomm_${topic.id}`,
    url: `${BASE}/t/${slug}/${topic.id}`,
    title: topic.title,
    body: '',
    author: null,
    posted_at: topic.created_at || null,
    metadata: {
      replies: topic.reply_count || 0,
      posts_count: topic.posts_count || 0,
      bumped_at: topic.bumped_at,
      pinned: topic.pinned || false,
    },
  };
}

/**
 * Fetch a single topic + first 10 posts. Used by MCP `community_get_thread`.
 */
export async function getThreadDetail(externalId) {
  const id = externalId.replace(/^shopifycomm_/, '');
  await sleep(5000);

  const res = await fetch(`${BASE}/t/${id}.json`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify Community fetch thread failed: ${res.status}`);
  }

  const data = await res.json();
  const posts = data.post_stream?.posts || [];
  return {
    title: data.title,
    body: posts[0]?.cooked?.replace(/<[^>]+>/g, '').trim().slice(0, 4000) || '',
    author: posts[0]?.username || null,
    posted_at: data.created_at,
    replies: posts.slice(1, 11).map(p => ({
      author: p.username,
      body: p.cooked?.replace(/<[^>]+>/g, '').trim().slice(0, 500) || '',
      posted_at: p.created_at,
    })),
  };
}
