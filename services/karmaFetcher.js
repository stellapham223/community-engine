// Fetch karma / trust level for team accounts.
// Reddit: /user/{username}/about.json (no auth)
// Shopify Community: /u/{username}.json (Discourse, no auth)

const USER_AGENT = 'joy-community-engine/0.1 (+https://joysubscription.com)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function fetchRedditKarma(username) {
  await sleep(1500);
  const res = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
    headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
  });
  if (!res.ok) throw new Error(`Reddit user ${username}: ${res.status}`);

  const data = await res.json();
  const d = data?.data;
  if (!d) throw new Error(`Reddit user ${username}: no data`);

  const linkKarma = d.link_karma ?? 0;
  const commentKarma = d.comment_karma ?? 0;
  return {
    link_karma: linkKarma,
    comment_karma: commentKarma,
    total_karma: linkKarma + commentKarma,
    trust_level: null,
    account_age_days: d.created_utc
      ? Math.floor((Date.now() / 1000 - d.created_utc) / 86400)
      : null,
    raw: d,
  };
}

export async function fetchShopifyCommunityKarma(username) {
  await sleep(5000);
  const res = await fetch(`https://community.shopify.com/u/${username}.json`, {
    headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
  });
  if (!res.ok) throw new Error(`Shopify Community user ${username}: ${res.status}`);

  const data = await res.json();
  const u = data?.user;
  if (!u) throw new Error(`Shopify Community user ${username}: no user`);

  return {
    link_karma: null,
    comment_karma: null,
    total_karma: null,
    trust_level: u.trust_level ?? 0,
    account_age_days: u.created_at
      ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86_400_000)
      : null,
    raw: u,
  };
}
