import {getRecentMentions, getMentionStats} from '../../lib/queries.js';
import {acknowledgeMention} from './actions.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MentionsPage({searchParams}) {
  const sp = await searchParams;
  const showAll = sp?.show === 'all';
  const days = parseInt(sp?.days || '30', 10);

  const [mentions, stats] = await Promise.all([
    getRecentMentions({days, includeAcknowledged: showAll, limit: 200}),
    getMentionStats(days),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organic Mentions</h1>
        <p className="text-sm text-slate-500 mt-1">When someone mentions Joy / a team handle in Reddit or Shopify Community.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={`Last ${days}d`} value={stats.total} />
        <Stat label="Unacked" value={stats.unack} accent />
        <Stat label="Brand mentions" value={stats.brand_mentions} />
        <Stat label="Handle pings" value={stats.handle_mentions} amber />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <FilterPill href={`/mentions?days=${days}`} active={!showAll}>Unacknowledged</FilterPill>
        <FilterPill href={`/mentions?days=${days}&show=all`} active={showAll}>All</FilterPill>
        <span className="text-slate-300">|</span>
        <FilterPill href="/mentions?days=7" active={days === 7}>7d</FilterPill>
        <FilterPill href="/mentions?days=30" active={days === 30}>30d</FilterPill>
        <FilterPill href="/mentions?days=90" active={days === 90}>90d</FilterPill>
      </div>

      {mentions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {mentions.map(m => <MentionCard key={m.id} mention={m} />)}
        </div>
      )}
    </div>
  );
}

function MentionCard({mention}) {
  const icon = mention.mention_type === 'team_handle_mention' ? '👤'
    : mention.mention_type === 'competitor_compare' ? '⚔️'
    : '💬';
  const author = mention.author
    ? (mention.platform === 'reddit' ? `u/${mention.author}` : `@${mention.author}`)
    : 'unknown';
  const platformLabel = mention.platform === 'reddit' ? 'Reddit' : 'Shopify Community';

  return (
    <article className={`bg-white rounded-xl border ${mention.acknowledged ? 'border-slate-200 opacity-60' : 'border-amber-200'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
            <span>{icon}</span>
            <span className="font-medium">{platformLabel}</span>
            <span>·</span>
            <span>{author}</span>
            <span>·</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded">"{mention.matched_phrase}"</span>
            {mention.is_first_party && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">first-party</span>
            )}
          </div>
          <a href={mention.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-primary block">
            {mention.title || '(no title)'}
          </a>
          {mention.body && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{mention.body}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Found {new Date(mention.discovered_at).toLocaleString()}
            {mention.posted_at && ` · Posted ${new Date(mention.posted_at).toLocaleDateString()}`}
          </p>
        </div>
        {!mention.acknowledged && (
          <form action={acknowledgeMention}>
            <input type="hidden" name="mention_id" value={mention.id} />
            <button type="submit" className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap">
              ✓ Ack
            </button>
          </form>
        )}
      </div>
      {mention.acknowledged_notes && (
        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">📝 {mention.acknowledged_notes}</p>
      )}
    </article>
  );
}

function Stat({label, value, accent, amber}) {
  let cls = 'border-slate-200';
  if (accent) cls = 'border-primary';
  else if (amber) cls = 'border-amber-300';
  return (
    <div className={`bg-white rounded-xl border ${cls} p-4`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function FilterPill({href, active, children}) {
  const cls = active
    ? 'bg-primary text-white'
    : 'bg-white border border-slate-200 text-slate-700 hover:border-primary';
  return (
    <Link href={href} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${cls}`}>
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center bg-white rounded-xl border border-slate-200 p-12">
      <p className="text-4xl mb-3">🌱</p>
      <p className="font-medium text-slate-900">No organic mentions yet</p>
      <p className="text-sm text-slate-500 mt-1">
        That's expected — Joy has near-zero organic mentions today (HubSpot AEO baseline).
      </p>
      <p className="text-xs text-slate-400 mt-3">
        Cron runs every 6h. First real mention = first social proof signal.
      </p>
    </div>
  );
}
