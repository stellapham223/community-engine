'use server';
import {sql} from '../../../db/client.js';
import {revalidatePath} from 'next/cache';

export async function markEngaged(formData) {
  const threadId = parseInt(formData.get('thread_id'), 10);
  const suggestionId = parseInt(formData.get('suggestion_id'), 10);
  const postedBy = formData.get('posted_by') || 'stella';
  const tone = formData.get('tone') || null;

  const [thread] = await sql`SELECT platform FROM cd_threads WHERE id = ${threadId}`;
  let teamAccountId = null;
  if (thread) {
    const [a] = await sql`
      SELECT id FROM cd_team_accounts
      WHERE LOWER(person_name) = LOWER(${postedBy}) AND platform = ${thread.platform} AND active = true
      LIMIT 1
    `;
    teamAccountId = a?.id || null;
  }

  await sql`UPDATE cd_threads SET status = 'engaged' WHERE id = ${threadId}`;
  await sql`
    INSERT INTO cd_engagements (thread_id, suggestion_id, posted_by, posted_at, tone, team_account_id)
    VALUES (${threadId}, ${suggestionId || null}, ${postedBy}, NOW(), ${tone}, ${teamAccountId})
  `;

  revalidatePath(`/threads/${threadId}`);
  revalidatePath('/');
}
