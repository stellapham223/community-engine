import {getTodayThreads, getOverallStats} from '../lib/queries.js';
import {computeRatio} from '../lib/ratio.js';
import ThreadCard from '../components/ThreadCard.jsx';
import BatchPromptButton from '../components/BatchPromptButton.jsx';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Today({searchParams}) {
  const sp = await searchParams;
  const status = sp?.status || 'active';
  const platform = sp?.platform || 'all';

  const [threads, stats, ratio] = await Promise.all([
    getTodayThreads({status, platform, limit: 100}),
    getOverallStats(7),
    computeRatio({days: 30}),
  ]);

  // Counts pulled from total stats (last 7 days), not filtered list
  const allCounts = {
    new: stats.overall.new_count,
    suggested: stats.overall.analyzed_count,
    engaged: stats.overall.engaged_count,
    total: stats.overall.total,
  };
  const skippedCount = allCounts.total - allCounts.new - allCounts.suggested - allCounts.engaged;
  const newThreads = threads.filter(t => t.status === 'new');

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Last 7 days" value={allCounts.total} accent />
        <StatCard label="New" value={allCounts.new} />
        <StatCard label="Drafted" value={allCounts.suggested} amber />
        <StatCard label="Engaged" value={allCounts.engaged} success />
        <StatCard label="Skipped" value={skippedCount} muted />
      </div>

      {/* 70/30 ratio meter (last 30 days) */}
      <RatioMeter ratio={ratio} />

      {/* Batch action */}
      {newThreads.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4">
          <div>
            <p className="font-medium text-primary">{newThreads.length} threads waiting for analysis</p>
            <p className="text-xs text-slate-600 mt-0.5">Generates ready-to-paste prompt for Claude Code (no API cost)</p>
          </div>
          <BatchPromptButton threads={newThreads} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill href="/" active={status === 'active' && platform === 'all'}>Active</FilterPill>
        <FilterPill href="/?status=suggested" active={status === 'suggested'}>Drafts ready ({allCounts.suggested})</FilterPill>
        <FilterPill href="/?status=new" active={status === 'new'}>New ({allCounts.new})</FilterPill>
        <FilterPill href="/?status=engaged" active={status === 'engaged'}>Engaged ({allCounts.engaged})</FilterPill>
        <FilterPill href="/?status=skipped" active={status === 'skipped'} muted>Skipped ({skippedCount})</FilterPill>
        <FilterPill href="/?status=all" active={status === 'all'}>All</FilterPill>
        <span className="mx-1 text-slate-300">|</span>
        <FilterPill href="/?platform=reddit" active={platform === 'reddit' && status === 'active'}>Reddit</FilterPill>
        <FilterPill href="/?platform=shopify_community" active={platform === 'shopify_community' && status === 'active'}>Shopify Community</FilterPill>
      </div>

      {/* Thread list */}
      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
        </div>
      )}
    </div>
  );
}

function RatioMeter({ratio}) {
  if (ratio.total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Pitch ratio (30d)</p>
        <p className="text-sm text-slate-500 mt-2">No engagements yet — mark some to start tracking</p>
      </div>
    );
  }

  const pct = ratio.pitch_pct;
  const threshold = ratio.threshold_pct;
  const healthy = ratio.is_healthy;
  const barColor = healthy ? 'bg-emerald-500' : 'bg-red-500';
  const labelColor = healthy ? 'text-emerald-700' : 'text-red-700';

  return (
    <div className={`bg-white rounded-xl border ${healthy ? 'border-slate-200' : 'border-red-300'} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Pitch ratio (30d)</p>
        <p className={`text-sm font-medium ${labelColor}`}>
          {pct}% pitch · target ≤{threshold}%
        </p>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{width: `${Math.min(100, pct)}%`}} />
        <div className="relative -mt-2 h-2">
          <div className="absolute h-full w-0.5 bg-slate-400" style={{left: `${threshold}%`}} title={`${threshold}% threshold`} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {ratio.helpful} helpful · {ratio.pitch} pitch
        {ratio.unclassified > 0 && ` · ${ratio.unclassified} unclassified`}
        {!healthy && <span className="text-red-600 ml-2">⚠ Skip pitch on next 2-3 posts</span>}
      </p>
    </div>
  );
}

function StatCard({label, value, accent, success, amber, muted}) {
  let cls = 'border-slate-200';
  let textCls = '';
  if (accent) cls = 'border-primary';
  else if (success) cls = 'border-emerald-300';
  else if (amber) cls = 'border-amber-300';
  else if (muted) { cls = 'border-slate-200 bg-slate-50'; textCls = 'text-slate-400'; }
  return (
    <div className={`bg-white rounded-xl border ${cls} p-4`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textCls}`}>{value}</p>
    </div>
  );
}

function FilterPill({href, active, muted, children}) {
  const base = active
    ? 'bg-primary text-white'
    : muted
      ? 'bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300'
      : 'bg-white border border-slate-200 text-slate-700 hover:border-primary';
  return (
    <Link href={href} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${base}`}>
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center bg-white rounded-xl border border-slate-200 p-12">
      <p className="text-4xl mb-3">📭</p>
      <p className="font-medium text-slate-900">No threads in this view</p>
      <p className="text-sm text-slate-500 mt-1">
        Run cron: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run cron:once</code>
      </p>
    </div>
  );
}
