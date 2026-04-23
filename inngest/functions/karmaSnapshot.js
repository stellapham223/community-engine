// Karma snapshot — daily fetch of karma / trust level for team accounts.

import {inngest} from '../client.js';
import {sql} from '../../db/client.js';
import {fetchRedditKarma, fetchShopifyCommunityKarma} from '../../services/karmaFetcher.js';

export const karmaSnapshotDaily = inngest.createFunction(
  {id: 'karma-snapshot-daily', name: 'Karma Snapshot — Daily'},
  {cron: '0 2 * * *'}, // 2am UTC
  async ({step}) => {
    const accounts = await step.run('load-accounts', async () => {
      return await sql`SELECT * FROM cd_team_accounts WHERE active = true`;
    });

    if (accounts.length === 0) {
      return {snapshots: 0, message: 'No team accounts seeded — run db/seed-team-accounts.js first'};
    }

    const results = await step.run('snapshot', async () => {
      const out = [];
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
          out.push({account: `${a.platform}/${a.username}`, ok: true, ...karma});
        } catch (e) {
          out.push({account: `${a.platform}/${a.username}`, ok: false, error: e.message});
        }
      }
      return out;
    });

    return {
      snapshots: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      details: results,
    };
  },
);
