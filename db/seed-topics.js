// Seed initial monitoring topics for Joy Subscriptions community engine
// Run: node db/seed-topics.js

import {sql} from './client.js';

const topics = [
  {
    name: 'Best Shopify subscription app',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'best subscription app',
      'best shopify subscription',
      'recommend subscription app',
      'subscription app shopify',
      'shopify subscribe and save',
    ],
    exclude_keywords: ['NSFW', 'gambling', 'crypto', 'OnlyFans'],
    subreddits: ['shopify', 'ecommerce', 'SmallBusiness', 'EntrepreneurRideAlong'],
  },
  {
    name: 'Competitor refugees',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'recharge alternative',
      'recharge alternatives',
      'switch from recharge',
      'leaving recharge',
      'appstle alternative',
      'seal subscription alternative',
      'bold subscription alternative',
      'kaching alternative',
      'loop subscription alternative',
      'subscription app cheaper than',
    ],
    subreddits: ['shopify', 'ecommerce'],
  },
  {
    name: 'Subscription pain points',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'subscription churn',
      'failed payment subscription',
      'subscription dunning',
      'subscriber retention shopify',
      'reduce subscription cancel',
      'subscription customer portal',
      'subscription pause skip',
    ],
    subreddits: ['shopify', 'ecommerce'],
  },
  {
    name: 'Subscription setup help',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'how to add subscription shopify',
      'set up subscription shopify',
      'launch subscription shopify',
      'first subscription store',
      'subscription model new store',
      'subscribe save setup',
    ],
    subreddits: ['shopify', 'ecommerce', 'SmallBusiness'],
  },
  {
    name: 'Vertical-specific subscription',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'coffee subscription shopify',
      'supplement subscription shopify',
      'pet food subscription shopify',
      'beauty subscription box shopify',
      'meal kit subscription shopify',
      'wine club shopify',
      'subscription box build a box',
    ],
    subreddits: ['shopify', 'ecommerce'],
  },
  {
    name: 'Subscription pricing model',
    platforms: ['reddit', 'shopify_community'],
    keywords: [
      'subscription pricing shopify',
      'free subscription app shopify',
      'no monthly fee subscription app',
      'revenue share subscription app',
      'subscription app cost',
      'subscription transaction fees',
    ],
    subreddits: ['shopify', 'ecommerce', 'SmallBusiness'],
  },
];

async function seed() {
  console.log(`Seeding ${topics.length} topics...`);

  for (const t of topics) {
    await sql`
      INSERT INTO cd_topics (name, platforms, keywords, exclude_keywords, subreddits, is_active)
      VALUES (${t.name}, ${t.platforms}, ${t.keywords}, ${t.exclude_keywords || null}, ${t.subreddits || null}, true)
      ON CONFLICT DO NOTHING
    `;
    console.log(`  ✓ ${t.name}`);
  }

  const count = await sql`SELECT COUNT(*) as n FROM cd_topics WHERE is_active = true`;
  console.log(`Done. ${count[0].n} active topics.`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
