// Run karma snapshot ONCE locally — bypasses Inngest plumbing.
// Usage: node --env-file=.env.local scripts/run-karma-snapshot.js

import {sql} from '../db/client.js';
import {fetchRedditKarma, fetchShopifyCommunityKarma} from '../services/karmaFetcher.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Karma Snapshot — Local Run');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const accounts = await sql`SELECT * FROM cd_team_accounts WHERE active = true`;
console.log(`✓ Loaded ${accounts.length} team accounts\n`);

if (accounts.length === 0) {
  console.log('No accounts to snapshot. Set env + run db/seed-team-accounts.js first.');
  process.exit(0);
}

let ok = 0, failed = 0;
for (const a of accounts) {
  try {
    const karma = a.platform === 'reddit'
      ? await fetchRedditKarma(a.username)
      : await fetchShopifyCommunityKarma(a.username);

    await sql`
      INSERT INTO cd_karma_snapshots
        (team_account_id, snapshot_date, link_karma, comment_karma, total_karma,
         trust_level, account_age_days, raw)
      VALUES
        (${a.id}, CURRENT_DATE, ${karma.link_karma}, ${karma.comment_karma},
         ${karma.total_karma}, ${karma.trust_level}, ${karma.account_age_days},
         ${JSON.stringify(karma.raw)})
      ON CONFLICT (team_account_id, snapshot_date) DO UPDATE SET
        link_karma = EXCLUDED.link_karma,
        comment_karma = EXCLUDED.comment_karma,
        total_karma = EXCLUDED.total_karma,
        trust_level = EXCLUDED.trust_level,
        account_age_days = EXCLUDED.account_age_days,
        raw = EXCLUDED.raw
    `;

    const display = a.platform === 'reddit'
      ? `${karma.total_karma} karma (${karma.link_karma}L + ${karma.comment_karma}C)`
      : `trust level ${karma.trust_level}`;
    console.log(`  ✓ ${a.platform}/${a.username}: ${display}`);
    ok++;
  } catch (e) {
    console.error(`  ⚠ ${a.platform}/${a.username}: ${e.message}`);
    failed++;
  }
}

console.log(`\n✓ ${ok} snapshots saved, ${failed} failed`);
process.exit(0);
