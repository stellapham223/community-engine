// Run evergreen revisit ONCE locally.
// Usage: node --env-file=.env.local scripts/run-evergreen-revisit.js

import {sql} from '../db/client.js';
import {getPostWithComments} from '../platforms/reddit.js';
import {getThreadDetail} from '../platforms/shopifyCommunity.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Evergreen Revisit — Local Run');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const engaged = await sql`
  SELECT id, platform, external_id, url, title, metadata
  FROM cd_threads
  WHERE status = 'engaged'
    AND discovered_at > NOW() - INTERVAL '90 days'
  ORDER BY discovered_at DESC
  LIMIT 50
`;
console.log(`✓ ${engaged.length} engaged threads to revisit\n`);

if (engaged.length === 0) {
  console.log('No engaged threads yet. Mark some via dashboard first.');
  process.exit(0);
}

let alertsCreated = 0;
for (const t of engaged) {
  try {
    let current;
    if (t.platform === 'reddit') {
      const data = await getPostWithComments(t.external_id);
      current = {
        num_replies: data.post?.metadata?.num_comments ?? data.comments?.length ?? 0,
        upvotes: data.post?.metadata?.upvotes ?? null,
        latest_reply: data.comments?.[0] || null,
      };
    } else if (t.platform === 'shopify_community') {
      const data = await getThreadDetail(t.external_id);
      current = {
        num_replies: data.replies?.length ?? 0,
        upvotes: null,
        latest_reply: data.replies?.[data.replies.length - 1] || null,
      };
    }

    const prevReplies = t.metadata?.num_comments ?? 0;
    const prevUpvotes = t.metadata?.upvotes ?? 0;

    const signals = [];
    if (current.num_replies > prevReplies) {
      signals.push({type: 'new_reply', new_count: current.num_replies - prevReplies});
    }
    if (current.upvotes != null && prevUpvotes > 0 && current.upvotes >= prevUpvotes * 2) {
      signals.push({type: 'gained_traction', from: prevUpvotes, to: current.upvotes});
    }
    if (current.latest_reply?.body?.includes('?')) {
      signals.push({type: 'followup_question', author: current.latest_reply.author});
    }

    for (const sig of signals) {
      await sql`
        INSERT INTO cd_revisit_alerts (thread_id, alert_type, details)
        VALUES (${t.id}, ${sig.type}, ${JSON.stringify({...sig, thread_url: t.url, thread_title: t.title})})
      `;
      alertsCreated++;
      console.log(`  + ${sig.type} on #${t.id}: ${t.title?.slice(0, 60)}`);
    }

    const newMeta = {...(t.metadata || {}), num_comments: current.num_replies, upvotes: current.upvotes};
    await sql`UPDATE cd_threads SET metadata = ${JSON.stringify(newMeta)} WHERE id = ${t.id}`;
  } catch (e) {
    console.error(`  ⚠ thread ${t.id}: ${e.message}`);
  }
}

console.log(`\n✓ ${alertsCreated} new revisit alerts created`);
process.exit(0);
