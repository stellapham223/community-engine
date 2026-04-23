'use server';
import {sql} from '../../db/client.js';
import {revalidatePath} from 'next/cache';

export async function resolveAlert(formData) {
  const id = parseInt(formData.get('id'), 10);
  await sql`
    UPDATE cd_revisit_alerts
    SET resolved = true, resolved_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath('/revisit');
}
