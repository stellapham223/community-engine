// Run giveback discovery ONCE locally.
// Usage: node --env-file=.env.local scripts/run-giveback-discovery.js

import {sql} from '../db/client.js';
import {fetchSubredditHot} from '../platforms/reddit.js';
import {filterGivebackThread} from '../services/givebackFilter.js';

const SUBS = ['shopify', 'ecommerce', 'SmallBusiness'];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Giveback Discovery — Local Run');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const all = [];
const seen = new Set();
for (const sub of SUBS) {
  try {
    console.log(`→ r/${sub} HOT...`);
    const posts = await fetchSubredditHot(sub, {limit: 25});
    let newCount = 0;
    for (const p of posts) {
      if (seen.has(p.external_id)) continue;
      seen.add(p.external_id);
      all.push(p);
      newCount++;
    }
    console.log(`  Got ${posts.length} (${newCount} unique)`);
  } catch (e) {
    console.error(`  ⚠ ${e.message}`);
  }
}

const filtered = all.map(filterGivebackThread).filter(Boolean);
console.log(`\n✓ ${filtered.length}/${all.length} pass giveback filter\n`);

let saved = 0;
for (const t of filtered) {
  try {
    const result = await sql`
      INSERT INTO cd_giveback_threads
        (platform, external_id, url, title, body, posted_at, category,
         difficulty, upvotes, num_replies, metadata)
      VALUES
        (${t.platform}, ${t.external_id}, ${t.url}, ${t.title}, ${t.body},
         ${t.posted_at}, ${t.category}, ${t.difficulty}, ${t.upvotes || null},
         ${t.num_replies || 0}, ${JSON.stringify(t.metadata || {})})
      ON CONFLICT (external_id) DO NOTHING
      RETURNING id
    `;
    if (result[0]) saved++;
  } catch (e) {
    console.error(`  ⚠ ${e.message}`);
  }
}

console.log(`✓ ${saved} new giveback threads saved`);

const breakdown = await sql`
  SELECT category, COUNT(*) as n FROM cd_giveback_threads
  WHERE status = 'new'
  GROUP BY category ORDER BY n DESC
`;
console.log('\nBy category (status=new):');
breakdown.forEach(b => console.log(`  ${b.category}: ${b.n}`));

process.exit(0);
