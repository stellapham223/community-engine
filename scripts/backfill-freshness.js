// One-shot backfill: compute freshness_score + freshness_band for existing rows.
// Usage: node --env-file=.env.local scripts/backfill-freshness.js

import {sql} from '../db/client.js';
import {computeFreshness} from '../services/freshness.js';

const rows = await sql`
  SELECT id, platform, posted_at, metadata
  FROM cd_threads
  WHERE freshness_band IS NULL
`;

console.log(`Backfilling ${rows.length} threads...`);

let updated = 0;
for (const t of rows) {
  const {score, band} = computeFreshness(t);
  await sql`
    UPDATE cd_threads SET freshness_score = ${score}, freshness_band = ${band}
    WHERE id = ${t.id}
  `;
  updated++;
}

console.log(`✓ Updated ${updated} rows`);

const breakdown = await sql`
  SELECT freshness_band, COUNT(*) as n FROM cd_threads
  GROUP BY freshness_band ORDER BY n DESC
`;
console.log('Distribution:');
breakdown.forEach(r => console.log(`  ${r.freshness_band ?? 'null'}: ${r.n}`));

process.exit(0);
