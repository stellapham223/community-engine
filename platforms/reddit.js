// Reddit search via RSS feeds — NO OAuth required, bypasses account anti-bot
// URL: https://www.reddit.com/r/{sub}/search.rss?q={kw}&sort=new&restrict_sr=1&t={range}

const USER_AGENT = 'joy-community-engine/0.1 (+https://joysubscription.com)';
const BASE = 'https://www.reddit.com';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Parse Reddit Atom feed via regex (lightweight, no xml2js dep)
function parseAtomFeed(xml) {
  const entries = [];
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

  for (const match of entryMatches) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeXml(m[1].trim()) : null;
    };
    const linkMatch = block.match(/<link\s+href="([^"]+)"/);
    const idMatch = get('id'); // format: t3_xxxx
    const id = idMatch?.replace(/^t3_/, '') || idMatch;
    const authorMatch = block.match(/<author>[\s\S]*?<name>\/u\/([^<]+)<\/name>/);
    const categoryMatch = block.match(/<category\s+term="([^"]+)"/);

    const contentRaw = get('content') || '';
    // Strip HTML tags from Atom content (it's HTML-encoded)
    const body = contentRaw
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);

    entries.push({
      platform: 'reddit',
      external_id: `reddit_${id}`,
      url: linkMatch?.[1] || '',
      title: get('title') || '',
      body,
      author: authorMatch?.[1] || null,
      posted_at: get('updated') || get('published') || null,
      metadata: {subreddit: categoryMatch?.[1] || null},
    });
  }
  return entries;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Search a subreddit via RSS.
 * @param {string} subreddit
 * @param {string} query
 * @param {object} options { limit, timeRange: 'day'|'week'|'month' }
 */
export async function searchSubreddit(subreddit, query, {limit = 25, timeRange = 'week'} = {}) {
  const url = `${BASE}/r/${subreddit}/search.rss?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&t=${timeRange}&limit=${limit}`;

  await sleep(1500); // polite

  const res = await fetch(url, {
    headers: {'User-Agent': USER_AGENT, Accept: 'application/atom+xml,application/xml'},
  });

  if (!res.ok) {
    throw new Error(`Reddit RSS failed: ${res.status}`);
  }

  const xml = await res.text();
  return parseAtomFeed(xml).slice(0, limit);
}

/**
 * Fetch r/{subreddit} HOT feed (no keyword search). For karma-building / giveback discovery.
 */
export async function fetchSubredditHot(subreddit, {limit = 25} = {}) {
  const url = `${BASE}/r/${subreddit}/hot.rss?limit=${limit}`;
  await sleep(1500);
  const res = await fetch(url, {
    headers: {'User-Agent': USER_AGENT, Accept: 'application/atom+xml,application/xml'},
  });
  if (!res.ok) throw new Error(`Reddit RSS hot failed: ${res.status}`);
  const xml = await res.text();
  return parseAtomFeed(xml).slice(0, limit);
}

/**
 * Fetch a single post + comments via Reddit's public JSON endpoint (no auth needed).
 */
export async function getPostWithComments(externalId) {
  const id = externalId.replace(/^reddit_/, '');
  await sleep(1500);

  const res = await fetch(`${BASE}/comments/${id}.json?limit=15&depth=2&raw_json=1`, {
    headers: {'User-Agent': USER_AGENT},
  });

  if (!res.ok) {
    throw new Error(`Reddit fetch comments failed: ${res.status}`);
  }

  const data = await res.json();
  const post = data[0]?.data?.children?.[0]?.data;
  const comments = (data[1]?.data?.children || [])
    .map(c => ({
      author: c.data.author,
      body: c.data.body,
      upvotes: c.data.ups,
      posted_at: c.data.created_utc ? new Date(c.data.created_utc * 1000).toISOString() : null,
    }))
    .filter(c => c.body && c.author !== '[deleted]');

  return {
    post: post ? {
      platform: 'reddit',
      external_id: `reddit_${post.id}`,
      url: `https://reddit.com${post.permalink}`,
      title: post.title,
      body: post.selftext || '',
      author: post.author,
      posted_at: new Date(post.created_utc * 1000).toISOString(),
      metadata: {
        subreddit: post.subreddit,
        upvotes: post.ups,
        num_comments: post.num_comments,
      },
    } : null,
    comments,
  };
}
