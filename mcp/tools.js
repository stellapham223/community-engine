// MCP tool definitions cho Joy Community Engine
// Stella uses these from Claude Code:
//   "Cho tôi xem community threads hôm nay"
//   "Phân tích thread #42"
//   "Đánh dấu thread #42 đã engage"
//
// Mounted as MCP server via @modelcontextprotocol/sdk

import {sql} from '../db/client.js';
import {getPostWithComments as getRedditThread} from '../platforms/reddit.js';
import {getThreadDetail as getShopifyThread} from '../platforms/shopifyCommunity.js';
import {
  TOPIC_RELEVANCE_SCORER_SYSTEM,
  COMMENT_GENERATOR_SYSTEM,
  SALESY_DETECTOR_SYSTEM,
  GIVEBACK_HELPFUL_SYSTEM,
} from '../services/llmPrompts.js';

// ─────────────────────────────────────────────
// Tool: community_today
// List today's filtered threads (raw, no drafts)
// ─────────────────────────────────────────────
export const communityToday = {
  name: 'community_today',
  description: 'List today\'s monitored community threads (Reddit + Shopify Community). Returns thread IDs Stella can analyze on-demand.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['new', 'suggested', 'engaged', 'all'],
        default: 'new',
        description: 'Filter by thread status',
      },
      platform: {
        type: 'string',
        enum: ['reddit', 'shopify_community', 'all'],
        default: 'all',
      },
      limit: {type: 'integer', default: 20, maximum: 50},
    },
  },
  async handler({status = 'new', platform = 'all', limit = 20}) {
    let rows;
    if (status === 'all' && platform === 'all') {
      rows = await sql`SELECT id, platform, external_id, url, title, posted_at, status, matched_keywords, metadata FROM cd_threads WHERE discovered_at >= CURRENT_DATE ORDER BY discovered_at DESC LIMIT ${limit}`;
    } else if (status === 'all') {
      rows = await sql`SELECT id, platform, external_id, url, title, posted_at, status, matched_keywords, metadata FROM cd_threads WHERE discovered_at >= CURRENT_DATE AND platform = ${platform} ORDER BY discovered_at DESC LIMIT ${limit}`;
    } else if (platform === 'all') {
      rows = await sql`SELECT id, platform, external_id, url, title, posted_at, status, matched_keywords, metadata FROM cd_threads WHERE discovered_at >= CURRENT_DATE AND status = ${status} ORDER BY discovered_at DESC LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT id, platform, external_id, url, title, posted_at, status, matched_keywords, metadata FROM cd_threads WHERE discovered_at >= CURRENT_DATE AND status = ${status} AND platform = ${platform} ORDER BY discovered_at DESC LIMIT ${limit}`;
    }
    return {threads: rows, count: rows.length};
  },
};

// ─────────────────────────────────────────────
// Tool: community_get_thread
// Fetch full thread content (title + body + replies) for analysis
// ─────────────────────────────────────────────
export const communityGetThread = {
  name: 'community_get_thread',
  description: 'Fetch full content of a community thread (title, body, replies). Use this before analyzing or drafting.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: {type: 'integer', description: 'cd_threads.id'},
    },
    required: ['thread_id'],
  },
  async handler({thread_id}) {
    const [thread] = await sql`
      SELECT * FROM cd_threads WHERE id = ${thread_id}
    `;
    if (!thread) throw new Error(`Thread ${thread_id} not found`);

    let detail;
    if (thread.platform === 'reddit') {
      detail = await getRedditThread(thread.external_id);
    } else if (thread.platform === 'shopify_community') {
      detail = await getShopifyThread(thread.external_id);
    } else {
      throw new Error(`Unsupported platform: ${thread.platform}`);
    }

    return {
      thread: {
        id: thread.id,
        platform: thread.platform,
        url: thread.url,
        title: thread.title,
        matched_keywords: thread.matched_keywords,
        metadata: thread.metadata,
      },
      content: detail,
    };
  },
};

// ─────────────────────────────────────────────
// Tool: community_analyze_thread
// Returns thread context + system prompts for Claude to score + draft IN-SESSION.
// LLM work happens in Claude's context (no API cost), or caller may use returned
// prompts to call Anthropic API explicitly.
// ─────────────────────────────────────────────
export const communityAnalyzeThread = {
  name: 'community_analyze_thread',
  description: 'Get thread + system prompts for relevance scoring and 3-draft generation. Claude in current session does the work — no Anthropic API call from server.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: {type: 'integer'},
    },
    required: ['thread_id'],
  },
  async handler({thread_id}) {
    const result = await communityGetThread.handler({thread_id});

    return {
      ...result,
      instructions: 'Use the system prompts below to: (1) score relevance 0-10, (2) generate 3 honest drafts. Then call community_save_suggestions to persist.',
      relevance_scorer_prompt: TOPIC_RELEVANCE_SCORER_SYSTEM,
      comment_generator_prompt: COMMENT_GENERATOR_SYSTEM,
      salesy_detector_prompt: SALESY_DETECTOR_SYSTEM,
    };
  },
};

// ─────────────────────────────────────────────
// Tool: community_save_suggestions
// Save the drafts Claude generated back to DB (so Stella can mark engaged later)
// ─────────────────────────────────────────────
export const communitySaveSuggestions = {
  name: 'community_save_suggestions',
  description: 'Save 3 generated comment drafts to DB. Call after analyzing a thread.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: {type: 'integer'},
      relevance_score: {type: 'integer', minimum: 0, maximum: 10},
      relevance_reasoning: {type: 'string'},
      drafts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            draft_number: {type: 'integer'},
            tone: {type: 'string', enum: ['helpful_only', 'helpful_with_joy_mention', 'recommend_alternatives']},
            comment_text: {type: 'string'},
            mentions_joy: {type: 'boolean'},
            mentions_competitors: {type: 'array', items: {type: 'string'}},
          },
          required: ['draft_number', 'tone', 'comment_text', 'mentions_joy'],
        },
        minItems: 3,
        maxItems: 3,
      },
    },
    required: ['thread_id', 'relevance_score', 'drafts'],
  },
  async handler({thread_id, relevance_score, relevance_reasoning, drafts}) {
    await sql`
      UPDATE cd_threads
      SET relevance_score = ${relevance_score},
          relevance_reasoning = ${relevance_reasoning || null},
          status = 'suggested'
      WHERE id = ${thread_id}
    `;

    await sql`DELETE FROM cd_suggestions WHERE thread_id = ${thread_id}`;

    for (const d of drafts) {
      const wordCount = d.comment_text.trim().split(/\s+/).length;
      await sql`
        INSERT INTO cd_suggestions
          (thread_id, draft_number, tone, comment_text, mentions_joy, mentions_competitors, word_count)
        VALUES
          (${thread_id}, ${d.draft_number}, ${d.tone}, ${d.comment_text},
           ${d.mentions_joy}, ${d.mentions_competitors || null}, ${wordCount})
      `;
    }

    return {ok: true, thread_id, saved_drafts: drafts.length};
  },
};

// ─────────────────────────────────────────────
// Tool: community_mark_engaged
// Mark thread as engaged (Stella posted manually). Now REQUIRES tone classification
// for 70/30 ratio tracking. Auto-resolves team_account_id from posted_by + platform.
// ─────────────────────────────────────────────
import {computeRatio} from '../lib/ratio.js';
import {sendSlack} from '../notifier/slack.js';

export const communityMarkEngaged = {
  name: 'community_mark_engaged',
  description: 'Mark a thread as engaged (someone manually posted to it). REQUIRES tone classification for 70/30 ratio tracking.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: {type: 'integer'},
      tone: {
        type: 'string',
        enum: ['helpful_only', 'helpful_with_joy_mention', 'recommend_alternatives'],
        description: 'How the post was framed. helpful_with_joy_mention counts toward 30% pitch budget.',
      },
      suggestion_id: {type: 'integer', description: 'Which draft was used (if any)'},
      posted_by: {type: 'string', default: 'stella', description: 'Person name (matches cd_team_accounts.person_name)'},
      notes: {type: 'string'},
    },
    required: ['thread_id', 'tone'],
  },
  async handler({thread_id, tone, suggestion_id, posted_by = 'stella', notes}) {
    // Look up thread to get platform → resolve team_account_id
    const [thread] = await sql`SELECT platform FROM cd_threads WHERE id = ${thread_id}`;
    if (!thread) throw new Error(`Thread ${thread_id} not found`);

    const [account] = await sql`
      SELECT id FROM cd_team_accounts
      WHERE LOWER(person_name) = LOWER(${posted_by}) AND platform = ${thread.platform} AND active = true
      LIMIT 1
    `;

    await sql`UPDATE cd_threads SET status = 'engaged' WHERE id = ${thread_id}`;
    const [eng] = await sql`
      INSERT INTO cd_engagements (thread_id, suggestion_id, posted_by, posted_at, notes, tone, team_account_id)
      VALUES (${thread_id}, ${suggestion_id || null}, ${posted_by}, NOW(), ${notes || null}, ${tone}, ${account?.id || null})
      RETURNING id
    `;

    // Recompute ratio + warn if breached
    const ratio = await computeRatio({days: 30});
    if (!ratio.is_healthy && tone === 'helpful_with_joy_mention') {
      try {
        await sendSlack(
          `⚠️ *Pitch ratio breach*\n` +
          `Last 30 days: ${ratio.total} posts → ${ratio.pitch} pitch (${ratio.pitch_pct}%) — over ${ratio.threshold_pct}% threshold.\n` +
          `Next 2-3 posts should be \`helpful_only\` or \`recommend_alternatives\` to stay credible.`,
        );
      } catch (e) {
        console.error('[mark_engaged] slack warn failed:', e.message);
      }
    }

    return {ok: true, engagement_id: eng.id, team_account_id: account?.id || null, ratio};
  },
};

// ─────────────────────────────────────────────
// Tool: community_top_competitors
// Which competitors come up most in discussions
// ─────────────────────────────────────────────
export const communityTopCompetitors = {
  name: 'community_top_competitors',
  description: 'List competitors mentioned most often in monitored threads (last N days).',
  inputSchema: {
    type: 'object',
    properties: {
      days: {type: 'integer', default: 7, maximum: 90},
    },
  },
  async handler({days = 7}) {
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
    return {period_days: days, ranked: counts.filter(c => c.mentions > 0).sort((a, b) => b.mentions - a.mentions)};
  },
};

// ─────────────────────────────────────────────
// Tool: community_engagement_stats
// Stella's engagement metrics
// ─────────────────────────────────────────────
export const communityEngagementStats = {
  name: 'community_engagement_stats',
  description: 'Get engagement statistics — threads scanned, engaged, by platform, by Stella vs others.',
  inputSchema: {
    type: 'object',
    properties: {
      days: {type: 'integer', default: 30},
    },
  },
  async handler({days = 30}) {
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
      SELECT platform, COUNT(*) as n, COUNT(*) FILTER (WHERE status = 'engaged') as engaged
      FROM cd_threads
      WHERE discovered_at >= NOW() - (${days} || ' days')::interval
      GROUP BY platform
    `;

    const byPerson = await sql`
      SELECT posted_by, COUNT(*) as n
      FROM cd_engagements
      WHERE posted_at >= NOW() - (${days} || ' days')::interval
      GROUP BY posted_by
    `;

    return {
      period_days: days,
      overall,
      by_platform: byPlatform,
      by_person: byPerson,
      engagement_rate_pct: overall.total > 0 ? Math.round((overall.engaged_count / overall.total) * 100) : 0,
    };
  },
};

// ─────────────────────────────────────────────
// Tool: community_topics_update
// Add/remove monitored keywords on the fly
// ─────────────────────────────────────────────
export const communityTopicsUpdate = {
  name: 'community_topics_update',
  description: 'Add or remove keywords from a monitored topic.',
  inputSchema: {
    type: 'object',
    properties: {
      topic_name: {type: 'string'},
      action: {type: 'string', enum: ['add', 'remove']},
      keywords: {type: 'array', items: {type: 'string'}},
    },
    required: ['topic_name', 'action', 'keywords'],
  },
  async handler({topic_name, action, keywords}) {
    const [topic] = await sql`SELECT * FROM cd_topics WHERE name = ${topic_name}`;
    if (!topic) throw new Error(`Topic '${topic_name}' not found`);

    const current = new Set(topic.keywords || []);
    if (action === 'add') {
      keywords.forEach(k => current.add(k));
    } else {
      keywords.forEach(k => current.delete(k));
    }

    await sql`
      UPDATE cd_topics
      SET keywords = ${[...current]}, updated_at = NOW()
      WHERE id = ${topic.id}
    `;
    return {ok: true, topic_name, total_keywords: current.size};
  },
};

// ─────────────────────────────────────────────
// Tool: community_mentions
// List recent organic mentions (people mentioning Joy or our team handles)
// ─────────────────────────────────────────────
export const communityMentions = {
  name: 'community_mentions',
  description: 'List recent organic mentions of Joy Subscriptions or team handles in monitored communities. Filter by acknowledged status.',
  inputSchema: {
    type: 'object',
    properties: {
      days: {type: 'integer', default: 30, maximum: 90},
      include_acknowledged: {type: 'boolean', default: false},
      limit: {type: 'integer', default: 50, maximum: 200},
    },
  },
  async handler({days = 30, include_acknowledged = false, limit = 50}) {
    let rows;
    if (include_acknowledged) {
      rows = await sql`
        SELECT id, platform, url, title, body, author, posted_at, mention_type,
               matched_phrase, is_first_party, acknowledged, acknowledged_notes, discovered_at
        FROM cd_mentions
        WHERE discovered_at >= NOW() - (${days} || ' days')::interval
        ORDER BY acknowledged ASC, discovered_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, platform, url, title, body, author, posted_at, mention_type,
               matched_phrase, is_first_party, acknowledged, acknowledged_notes, discovered_at
        FROM cd_mentions
        WHERE discovered_at >= NOW() - (${days} || ' days')::interval
          AND acknowledged = false
        ORDER BY discovered_at DESC
        LIMIT ${limit}
      `;
    }
    return {mentions: rows, count: rows.length, period_days: days};
  },
};

// ─────────────────────────────────────────────
// Tool: community_acknowledge_mention
// Mark a mention as seen + add followup notes
// ─────────────────────────────────────────────
export const communityAcknowledgeMention = {
  name: 'community_acknowledge_mention',
  description: 'Mark an organic mention as seen / acknowledged. Optionally add notes about followup action taken.',
  inputSchema: {
    type: 'object',
    properties: {
      mention_id: {type: 'integer'},
      notes: {type: 'string', description: 'What action was taken (e.g., "thanked the user", "added to testimonials")'},
    },
    required: ['mention_id'],
  },
  async handler({mention_id, notes}) {
    await sql`
      UPDATE cd_mentions
      SET acknowledged = true, acknowledged_notes = ${notes || null}
      WHERE id = ${mention_id}
    `;
    return {ok: true, mention_id};
  },
};

// ─────────────────────────────────────────────
// Tool: community_revisit_alerts
// Weekly evergreen alerts — engaged threads with new replies / traction
// ─────────────────────────────────────────────
export const communityRevisitAlerts = {
  name: 'community_revisit_alerts',
  description: 'List unresolved revisit alerts — engaged threads that gained new replies or traction. Use to schedule follow-up comments.',
  inputSchema: {
    type: 'object',
    properties: {
      include_resolved: {type: 'boolean', default: false},
      limit: {type: 'integer', default: 20, maximum: 100},
    },
  },
  async handler({include_resolved = false, limit = 20}) {
    const rows = include_resolved
      ? await sql`
          SELECT a.*, t.title as thread_title, t.url as thread_url, t.platform
          FROM cd_revisit_alerts a JOIN cd_threads t ON t.id = a.thread_id
          ORDER BY a.resolved ASC, a.created_at DESC LIMIT ${limit}`
      : await sql`
          SELECT a.*, t.title as thread_title, t.url as thread_url, t.platform
          FROM cd_revisit_alerts a JOIN cd_threads t ON t.id = a.thread_id
          WHERE a.resolved = false
          ORDER BY a.created_at DESC LIMIT ${limit}`;
    return {alerts: rows, count: rows.length};
  },
};

// ─────────────────────────────────────────────
// Tool: community_giveback_today
// List karma-building threads (non-subscription Shopify questions)
// ─────────────────────────────────────────────
export const communityGivebackToday = {
  name: 'community_giveback_today',
  description: 'List non-subscription Shopify questions Stella can answer for karma building. Filter by category.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {type: 'string', description: 'shipping, theme, apps_general, payment, discount, inventory, marketing, seo, other, all'},
      status: {type: 'string', enum: ['new', 'answered', 'skipped'], default: 'new'},
      limit: {type: 'integer', default: 20, maximum: 100},
    },
  },
  async handler({category = 'all', status = 'new', limit = 20}) {
    const rows = category === 'all'
      ? await sql`SELECT * FROM cd_giveback_threads WHERE status = ${status} ORDER BY discovered_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM cd_giveback_threads WHERE status = ${status} AND category = ${category} ORDER BY discovered_at DESC LIMIT ${limit}`;
    return {threads: rows, count: rows.length};
  },
};

// ─────────────────────────────────────────────
// Tool: community_giveback_analyze
// Fetch giveback thread + return helpful-only system prompt for Claude to draft.
// NO Joy mention — pure karma play.
// ─────────────────────────────────────────────
export const communityGivebackAnalyze = {
  name: 'community_giveback_analyze',
  description: 'Get a giveback thread + helpful-only system prompt for Claude to draft a karma reply (NO Joy mention, pure expertise).',
  inputSchema: {
    type: 'object',
    properties: {
      id: {type: 'integer', description: 'cd_giveback_threads.id'},
    },
    required: ['id'],
  },
  async handler({id}) {
    const [thread] = await sql`SELECT * FROM cd_giveback_threads WHERE id = ${id}`;
    if (!thread) throw new Error(`Giveback thread ${id} not found`);

    // Re-fetch full body + replies if Reddit (RSS only gives excerpt)
    let detail = null;
    if (thread.platform === 'reddit') {
      try {
        detail = await getRedditThread(thread.external_id);
      } catch (e) {
        console.error('[giveback_analyze] reddit fetch:', e.message);
      }
    }

    return {
      thread: {
        id: thread.id,
        platform: thread.platform,
        url: thread.url,
        title: thread.title,
        body: thread.body,
        category: thread.category,
        difficulty: thread.difficulty,
        upvotes: thread.upvotes,
        num_replies: thread.num_replies,
      },
      content: detail,
      instructions: 'Use the system prompt below to draft ONE helpful reply. Do NOT mention Joy Subscriptions. Match the category framing.',
      helpful_prompt: GIVEBACK_HELPFUL_SYSTEM,
    };
  },
};

// ─────────────────────────────────────────────
// Tool: community_giveback_mark_answered
// ─────────────────────────────────────────────
export const communityGivebackMarkAnswered = {
  name: 'community_giveback_mark_answered',
  description: 'Mark a giveback thread as answered (Stella replied for karma).',
  inputSchema: {
    type: 'object',
    properties: {
      id: {type: 'integer'},
      status: {type: 'string', enum: ['answered', 'skipped'], default: 'answered'},
    },
    required: ['id'],
  },
  async handler({id, status = 'answered'}) {
    await sql`UPDATE cd_giveback_threads SET status = ${status} WHERE id = ${id}`;
    return {ok: true, id, status};
  },
};

// ─────────────────────────────────────────────
// Tool: community_ratio
// Get current 70/30 helpful-to-pitch ratio
// ─────────────────────────────────────────────
export const communityRatio = {
  name: 'community_ratio',
  description: 'Compute helpful-to-pitch engagement ratio. Healthy = pitch ≤ 30% of total. Use to check before next post.',
  inputSchema: {
    type: 'object',
    properties: {
      days: {type: 'integer', default: 30, maximum: 90},
      person_name: {type: 'string', description: 'Filter by person (matches cd_team_accounts.person_name)'},
    },
  },
  async handler({days = 30, person_name}) {
    let teamAccountId = null;
    if (person_name) {
      const [a] = await sql`
        SELECT id FROM cd_team_accounts
        WHERE LOWER(person_name) = LOWER(${person_name}) AND active = true
        ORDER BY is_primary DESC LIMIT 1
      `;
      teamAccountId = a?.id || null;
    }
    return await computeRatio({teamAccountId, days});
  },
};

// ─────────────────────────────────────────────
// Export all tools
// ─────────────────────────────────────────────
export const allTools = [
  communityToday,
  communityGetThread,
  communityAnalyzeThread,
  communitySaveSuggestions,
  communityMarkEngaged,
  communityTopCompetitors,
  communityEngagementStats,
  communityTopicsUpdate,
  communityMentions,
  communityAcknowledgeMention,
  communityRatio,
  communityGivebackToday,
  communityGivebackAnalyze,
  communityGivebackMarkAnswered,
  communityRevisitAlerts,
];
