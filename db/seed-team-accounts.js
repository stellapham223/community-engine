// Seed cd_team_accounts from env vars.
// Format: TEAM_ACCOUNTS_REDDIT="stella=stella-joy:primary,philip=philip-avada"
//         TEAM_ACCOUNTS_SHOPIFY="stella=Stella_Joy:primary"
// Usage: node --env-file=.env.local db/seed-team-accounts.js

import {sql} from './client.js';

function parseAccountsEnv(envValue) {
  if (!envValue) return [];
  return envValue.split(',').map(entry => {
    const [person, rest] = entry.trim().split('=');
    if (!person || !rest) throw new Error(`Bad entry: "${entry}" — expected "person=username[:primary]"`);
    const [username, flag] = rest.split(':');
    return {
      person_name: person.trim(),
      username: username.trim(),
      is_primary: flag?.trim() === 'primary',
    };
  });
}

const reddit = parseAccountsEnv(process.env.TEAM_ACCOUNTS_REDDIT).map(a => ({...a, platform: 'reddit'}));
const shopify = parseAccountsEnv(process.env.TEAM_ACCOUNTS_SHOPIFY).map(a => ({...a, platform: 'shopify_community'}));
const all = [...reddit, ...shopify];

if (all.length === 0) {
  console.error('No accounts found. Set TEAM_ACCOUNTS_REDDIT and/or TEAM_ACCOUNTS_SHOPIFY env vars.');
  console.error('Example:');
  console.error('  TEAM_ACCOUNTS_REDDIT="stella=stella-joy:primary,philip=philip-avada"');
  console.error('  TEAM_ACCOUNTS_SHOPIFY="stella=Stella_Joy:primary"');
  process.exit(1);
}

console.log(`Seeding ${all.length} accounts...`);
for (const a of all) {
  await sql`
    INSERT INTO cd_team_accounts (person_name, platform, username, is_primary)
    VALUES (${a.person_name}, ${a.platform}, ${a.username}, ${a.is_primary})
    ON CONFLICT (platform, username) DO UPDATE SET
      person_name = EXCLUDED.person_name,
      is_primary = EXCLUDED.is_primary,
      active = true
  `;
  console.log(`  ✓ ${a.platform}/${a.username} (${a.person_name})${a.is_primary ? ' [primary]' : ''}`);
}

console.log('\nDone.');
process.exit(0);
