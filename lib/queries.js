// Server-side data fetching for dashboard pages
import {sql} from '../db/client.js';

// Sort priority: suggested → new → engaged → skipped (drafts-ready first, noise last)
export async function getTodayThreads({status = 'active', platform = 'all', limit = 100} = {}) {
  // 'active' = exclude skipped (default for Stella's review)
  // 'all' = include everything
  // specific status = filter exactly
  if (status === 'active' && platform === 'all') {
    return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
      WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days' AND t.status != 'skipped'
      ORDER BY CASE t.status WHEN 'suggested' THEN 1 WHEN 'new' THEN 2 WHEN 'engaged' THEN 3 ELSE 5 END, t.discovered_at DESC
      LIMIT ${limit}`;
  }
  if (status === 'active') {
    return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
      WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days' AND t.status != 'skipped' AND t.platform = ${platform}
      ORDER BY CASE t.status WHEN 'suggested' THEN 1 WHEN 'new' THEN 2 WHEN 'engaged' THEN 3 ELSE 5 END, t.discovered_at DESC
      LIMIT ${limit}`;
  }
  if (status === 'all' && platform === 'all') {
    return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
      WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY CASE t.status WHEN 'suggested' THEN 1 WHEN 'new' THEN 2 WHEN 'engaged' THEN 3 WHEN 'skipped' THEN 4 ELSE 5 END, t.discovered_at DESC
      LIMIT ${limit}`;
  }
  if (status === 'all') {
    return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
      WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days' AND t.platform = ${platform}
      ORDER BY CASE t.status WHEN 'suggested' THEN 1 WHEN 'new' THEN 2 WHEN 'engaged' THEN 3 WHEN 'skipped' THEN 4 ELSE 5 END, t.discovered_at DESC
      LIMIT ${limit}`;
  }
  if (platform === 'all') {
    return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
      WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days' AND t.status = ${status}
      ORDER BY t.discovered_at DESC LIMIT ${limit}`;
  }
  return sql`SELECT t.*, top.name as topic_name FROM cd_threads t LEFT JOIN cd_topics top ON top.id = t.topic_id
    WHERE t.discovered_at >= CURRENT_DATE - INTERVAL '7 days' AND t.status = ${status} AND t.platform = ${platform}
    ORDER BY t.discovered_at DESC LIMIT ${limit}`;
}

export async function getThreadById(id) {
  const [thread] = await sql`
    SELECT t.*, top.name as topic_name
    FROM cd_threads t
    LEFT JOIN cd_topics top ON top.id = t.topic_id
    WHERE t.id = ${id}
  `;
  return thread || null;
}

export async function getSuggestionsForThread(threadId) {
  return sql`
    SELECT * FROM cd_suggestions WHERE thread_id = ${threadId} ORDER BY draft_number ASC
  `;
}

export async function getEngagementsForThread(threadId) {
  return sql`
    SELECT * FROM cd_engagements WHERE thread_id = ${threadId} ORDER BY posted_at DESC
  `;
}

export async function getOverallStats(days = 30) {
  const [overall] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new') as new_count,
      COUNT(*) FILTER (WHERE status = 'suggested') as analyzed_count,
      COUNT(*) FILTER (WHERE status = 'engaged') as engaged_count,
      COUNT(*) as total
    FROM cd_threads
    WHERE discovered_at >= NOW() - (${days} || ' days')::interval
  `;

  const byPlatform = await sql`
    SELECT platform, COUNT(*) as n,
           COUNT(*) FILTER (WHERE status = 'engaged') as engaged
    FROM cd_threads
    WHERE discovered_at >= NOW() - (${days} || ' days')::interval
    GROUP BY platform
  `;

  const recentDigests = await sql`
    SELECT * FROM cd_daily_digests
    WHERE digest_date >= CURRENT_DATE - INTERVAL '14 days'
    ORDER BY digest_date DESC
  `;

  return {overall, byPlatform, recentDigests};
}

export async function getTopCompetitors(days = 30) {
  const competitors = ['Recharge', 'Appstle', 'Bold', 'Seal', 'Loop', 'Skio', 'Kaching', 'Subbly', 'Subi', 'PayWhirl'];
  const counts = [];
  for (const c of competitors) {
    const [r] = await sql`
      SELECT COUNT(*) as n FROM cd_threads
      WHERE discovered_at >= NOW() - (${days} || ' days')::interval
        AND (LOWER(title) LIKE ${'%' + c.toLowerCase() + '%'} OR LOWER(body) LIKE ${'%' + c.toLowerCase() + '%'})
    `;
    counts.push({competitor: c, mentions: parseInt(r.n, 10)});
  }
  return counts.filter(c => c.mentions > 0).sort((a, b) => b.mentions - a.mentions);
}

export async function getAllTopics() {
  return sql`SELECT * FROM cd_topics ORDER BY name ASC`;
}

export async function getRecentMentions({days = 30, includeAcknowledged = false, limit = 100} = {}) {
  if (includeAcknowledged) {
    return sql`
      SELECT * FROM cd_mentions
      WHERE discovered_at >= NOW() - (${days} || ' days')::interval
      ORDER BY acknowledged ASC, discovered_at DESC
      LIMIT ${limit}
    `;
  }
  return sql`
    SELECT * FROM cd_mentions
    WHERE discovered_at >= NOW() - (${days} || ' days')::interval
      AND acknowledged = false
    ORDER BY discovered_at DESC
    LIMIT ${limit}
  `;
}

export async function getTeamAccounts() {
  return sql`SELECT * FROM cd_team_accounts WHERE active = true ORDER BY platform, person_name`;
}

export async function getKarmaTrend(teamAccountId, days = 90) {
  return sql`
    SELECT * FROM cd_karma_snapshots
    WHERE team_account_id = ${teamAccountId}
      AND snapshot_date >= CURRENT_DATE - (${days} || ' days')::interval
    ORDER BY snapshot_date ASC
  `;
}

export async function getLatestKarma() {
  return sql`
    SELECT DISTINCT ON (a.id)
      a.id, a.person_name, a.platform, a.username, a.is_primary,
      s.snapshot_date, s.link_karma, s.comment_karma, s.total_karma,
      s.trust_level, s.account_age_days
    FROM cd_team_accounts a
    LEFT JOIN cd_karma_snapshots s ON s.team_account_id = a.id
    WHERE a.active = true
    ORDER BY a.id, s.snapshot_date DESC NULLS LAST
  `;
}

export async function getGivebackThreads({status = 'new', category = 'all', limit = 100} = {}) {
  if (category === 'all') {
    return sql`SELECT * FROM cd_giveback_threads
      WHERE status = ${status}
      ORDER BY discovered_at DESC LIMIT ${limit}`;
  }
  return sql`SELECT * FROM cd_giveback_threads
    WHERE status = ${status} AND category = ${category}
    ORDER BY discovered_at DESC LIMIT ${limit}`;
}

export async function getGivebackStats(days = 30) {
  const [stats] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new') as new_count,
      COUNT(*) FILTER (WHERE status = 'answered') as answered_count,
      COUNT(*) FILTER (WHERE status = 'skipped') as skipped_count,
      COUNT(*) as total
    FROM cd_giveback_threads
    WHERE discovered_at >= NOW() - (${days} || ' days')::interval
  `;
  return stats;
}

export async function getRevisitAlerts({includeResolved = false, limit = 100} = {}) {
  if (includeResolved) {
    return sql`
      SELECT a.*, t.title as thread_title, t.url as thread_url, t.platform
      FROM cd_revisit_alerts a
      JOIN cd_threads t ON t.id = a.thread_id
      ORDER BY a.resolved ASC, a.created_at DESC
      LIMIT ${limit}
    `;
  }
  return sql`
    SELECT a.*, t.title as thread_title, t.url as thread_url, t.platform
    FROM cd_revisit_alerts a
    JOIN cd_threads t ON t.id = a.thread_id
    WHERE a.resolved = false
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;
}

export async function getMentionStats(days = 30) {
  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE acknowledged = false) as unack,
      COUNT(*) FILTER (WHERE is_first_party = false) as third_party,
      COUNT(*) FILTER (WHERE mention_type = 'team_handle_mention') as handle_mentions,
      COUNT(*) FILTER (WHERE mention_type = 'brand_mention') as brand_mentions,
      COUNT(*) FILTER (WHERE mention_type = 'competitor_compare') as compare_mentions
    FROM cd_mentions
    WHERE discovered_at >= NOW() - (${days} || ' days')::interval
  `;
  return stats;
}
