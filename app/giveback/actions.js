'use server';
import {sql} from '../../db/client.js';
import {revalidatePath} from 'next/cache';

export async function markGivebackAnswered(formData) {
  const id = parseInt(formData.get('id'), 10);
  await sql`UPDATE cd_giveback_threads SET status = 'answered' WHERE id = ${id}`;
  revalidatePath('/giveback');
}

export async function skipGiveback(formData) {
  const id = parseInt(formData.get('id'), 10);
  await sql`UPDATE cd_giveback_threads SET status = 'skipped' WHERE id = ${id}`;
  revalidatePath('/giveback');
}
