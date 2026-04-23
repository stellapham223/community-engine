// Freshness scoring — how time-sensitive a thread is for engagement.
// Reddit decays fast (replies after 48h get few eyeballs). Discourse threads
// stay alive longer because they get bumped on every new reply.

/**
 * @param {object} thread - { platform, posted_at, metadata }
 * @returns {{ score: number, band: 'hot'|'warm'|'cold' }}
 */
export function computeFreshness(thread) {
  const postedAt = thread.posted_at ? new Date(thread.posted_at) : null;
  if (!postedAt || Number.isNaN(postedAt.getTime())) {
    return {score: 0, band: 'cold'};
  }

  if (thread.platform === 'reddit') {
    const ageH = (Date.now() - postedAt.getTime()) / 36e5;
    if (ageH < 24) return {score: Math.round(100 - ageH * 0.8), band: 'hot'};
    if (ageH < 168) return {score: Math.round(80 - (ageH - 24) * 0.3), band: 'warm'};
    return {score: Math.max(0, Math.round(40 - (ageH - 168) * 0.05)), band: 'cold'};
  }

  if (thread.platform === 'shopify_community') {
    // Discourse — bumped_at reflects last reply, better signal than posted_at
    const bumpRaw = thread.metadata?.bumped_at;
    const bumpAt = bumpRaw ? new Date(bumpRaw) : postedAt;
    const bumpH = (Date.now() - bumpAt.getTime()) / 36e5;
    if (bumpH < 48) return {score: 90, band: 'hot'};
    if (bumpH < 336) return {score: 60, band: 'warm'};
    return {score: 20, band: 'cold'};
  }

  return {score: 50, band: 'warm'};
}
