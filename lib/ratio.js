// 70/30 helpful-to-pitch ratio tracker.
// Computed from cd_engagements.tone over a rolling window.
// helpful_only + recommend_alternatives count as "helpful"; helpful_with_joy_mention = "pitch".

import {sql} from '../db/client.js';

const PITCH_THRESHOLD = 0.30;

/**
 * Compute pitch ratio over the last N days, optionally per team account.
 */
export async function computeRatio({teamAccountId = null, days = 30} = {}) {
  const rows = teamAccountId
    ? await sql`
        SELECT tone, COUNT(*) as n FROM cd_engagements
        WHERE posted_at >= NOW() - (${days} || ' days')::interval
          AND team_account_id = ${teamAccountId}
        GROUP BY tone`
    : await sql`
        SELECT tone, COUNT(*) as n FROM cd_engagements
        WHERE posted_at >= NOW() - (${days} || ' days')::interval
        GROUP BY tone`;

  const tones = Object.fromEntries(rows.map(r => [r.tone || 'unclassified', parseInt(r.n, 10)]));
  const helpful = (tones.helpful_only || 0) + (tones.recommend_alternatives || 0);
  const pitch = tones.helpful_with_joy_mention || 0;
  const unclassified = tones.unclassified || 0;
  const total = helpful + pitch;

  return {
    helpful,
    pitch,
    unclassified,
    total,
    pitch_pct: total > 0 ? Math.round((pitch / total) * 100) : 0,
    is_healthy: total === 0 || pitch / total <= PITCH_THRESHOLD,
    threshold_pct: Math.round(PITCH_THRESHOLD * 100),
  };
}
