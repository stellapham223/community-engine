'use server';
import {sql} from '../../db/client.js';
import {revalidatePath} from 'next/cache';

export async function acknowledgeMention(formData) {
  const id = parseInt(formData.get('mention_id'), 10);
  const notes = formData.get('notes') || null;
  await sql`
    UPDATE cd_mentions
    SET acknowledged = true, acknowledged_notes = ${notes}
    WHERE id = ${id}
  `;
  revalidatePath('/mentions');
}
