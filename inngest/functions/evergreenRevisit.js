// Evergreen revisit — weekly, re-fetch threads where Stella engaged. Compare reply
// count against snapshot. Surface threads with new replies for follow-up.

import {inngest} from '../client.js';
import {sql} from '../../db/client.js';
import {getPostWithComments} from '../../platforms/reddit.js';
import {getThreadDetail} from '../../platforms/shopifyCommunity.js';
import {sendSlack} from '../../notifier/slack.js';

async function refetch(thread) {
  if (thread.platform === 'reddit') {
    const data = await getPostWithComments(thread.external_id);
    return {
      num_replies: data.post?.metadata?.num_comments ?? data.comments?.length ?? 0,
      upvotes: data.post?.metadata?.upvotes ?? null,
      latest_reply: data.comments?.[0] || null,
    };
  }
  if (thread.platform === 'shopify_community') {
    const data = await getThreadDetail(thread.external_id);
    return {
      num_replies: data.replies?.length ?? 0,
      upvotes: null,
      latest_reply: data.replies?.[data.replies.length - 1] || null,
    };
  }
  return null;
}

function detectSignals(snapshot, current) {
  const signals = [];
  const prevReplies = snapshot?.num_replies ?? 0;
  const prevUpvotes = snapshot?.upvotes ?? 0;

  if (current.num_replies > prevReplies) {
    signals.push({type: 'new_reply', new_count: current.num_replies - prevReplies});
  }
  if (current.upvotes != null && prevUpvotes > 0 && current.upvotes >= prevUpvotes * 2) {
    signals.push({type: 'gained_traction', from: prevUpvotes, to: current.upvotes});
  }
  if (current.latest_reply?.body?.includes('?')) {
    signals.push({type: 'followup_question', author: current.latest_reply.author});
  }
  return signals;
}

export const evergreenRevisitWeekly = inngest.createFunction(
  {id: 'evergreen-revisit-weekly', name: 'Evergreen Revisit — Weekly'},
  {cron: '0 4 * * 1'}, // Mondays 4am UTC
  async ({step}) => {
    const engaged = await step.run('load-engaged', async () => {
      return await sql`
        SELECT id, platform, external_id, url, title, metadata
        FROM cd_threads
        WHERE status = 'engaged'
          AND discovered_at > NOW() - INTERVAL '90 days'
        ORDER BY discovered_at DESC
        LIMIT 50
      `;
    });

    const alerts = await step.run('detect', async () => {
      const out = [];
      for (const t of engaged) {
        try {
          const current = await refetch(t);
          if (!current) continue;
          const signals = detectSignals(t.metadata, current);
          for (const sig of signals) {
            const result = await sql`
              INSERT INTO cd_revisit_alerts (thread_id, alert_type, details)
              VALUES (${t.id}, ${sig.type}, ${JSON.stringify({...sig, thread_url: t.url, thread_title: t.title})})
              RETURNING id, alert_type, details
            `;
            out.push(result[0]);
          }
          // Update snapshot in metadata
          const newMeta = {...(t.metadata || {}), num_comments: current.num_replies, upvotes: current.upvotes};
          await sql`UPDATE cd_threads SET metadata = ${JSON.stringify(newMeta)} WHERE id = ${t.id}`;
        } catch (e) {
          console.error(`[evergreen] thread ${t.id}:`, e.message);
        }
      }
      return out;
    });

    await step.run('alert', async () => {
      if (alerts.length === 0) return {sent: false};

      const groups = {};
      for (const a of alerts) {
        if (!groups[a.alert_type]) groups[a.alert_type] = [];
        groups[a.alert_type].push(a);
      }

      let msg = `🔁 *Evergreen revisit — ${alerts.length} alerts*\n\n`;
      const labels = {new_reply: '💬 New replies', gained_traction: '📈 Gained traction', followup_question: '❓ Follow-up question'};
      for (const [type, list] of Object.entries(groups)) {
        msg += `*${labels[type] || type} (${list.length}):*\n`;
        for (const a of list.slice(0, 5)) {
          msg += `• ${a.details.thread_title?.slice(0, 90)}\n  ${a.details.thread_url}\n`;
        }
        msg += '\n';
      }
      await sendSlack(msg);
      return {sent: true, count: alerts.length};
    });

    return {revisited: engaged.length, alerts: alerts.length};
  },
);
