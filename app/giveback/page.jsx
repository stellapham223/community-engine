import {getGivebackThreads, getGivebackStats} from '../../lib/queries.js';
import {markGivebackAnswered, skipGiveback} from './actions.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['all', 'shipping', 'theme', 'apps_general', 'payment', 'discount', 'inventory', 'marketing', 'seo', 'other'];

export default async function GivebackPage({searchParams}) {
  const sp = await searchParams;
  const status = sp?.status || 'new';
  const category = sp?.category || 'all';

  const [threads, stats] = await Promise.all([
    getGivebackThreads({status, category, limit: 100}),
    getGivebackStats(30),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎁 Karma Threads</h1>
        <p className="text-sm text-slate-500 mt-1">
          Non-subscription questions on r/shopify + r/ecommerce. Answer 5-10/week to build karma + recognition.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="To answer" value={stats.new_count} accent />
        <Stat label="Answered" value={stats.answered_count} success />
        <Stat label="Skipped" value={stats.skipped_count} muted />
        <Stat label="30d total" value={stats.total} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterPill href={`/giveback?category=${category}`} active={status === 'new'}>To answer</FilterPill>
        <FilterPill href={`/giveback?status=answered&category=${category}`} active={status === 'answered'}>Answered</FilterPill>
        <FilterPill href={`/giveback?status=skipped&category=${category}`} active={status === 'skipped'}>Skipped</FilterPill>
        <span className="mx-1 text-slate-300">|</span>
        {CATEGORIES.map(c => (
          <FilterPill key={c} href={`/giveback?status=${status}&category=${c}`} active={category === c}>
            {c}
          </FilterPill>
        ))}
      </div>

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {threads.map(t => <GivebackCard key={t.id} thread={t} />)}
        </div>
      )}
    </div>
  );
}

function GivebackCard({thread}) {
  const isAnswered = thread.status === 'answered';
  const isSkipped = thread.status === 'skipped';

  return (
    <article className={`bg-white rounded-xl border ${isAnswered ? 'border-emerald-200 opacity-70' : isSkipped ? 'border-slate-200 opacity-50' : 'border-slate-200'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded">{thread.category}</span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{thread.difficulty}</span>
            {thread.upvotes != null && <span>↑ {thread.upvotes}</span>}
            {thread.num_replies > 0 && <span>💬 {thread.num_replies}</span>}
          </div>
          <a href={thread.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-primary block">
            {thread.title}
          </a>
          {thread.body && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{thread.body}</p>
          )}
        </div>
        {!isAnswered && !isSkipped && (
          <div className="flex flex-col gap-2 shrink-0">
            <form action={markGivebackAnswered}>
              <input type="hidden" name="id" value={thread.id} />
              <button type="submit" className="w-full px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap">
                ✓ Answered
              </button>
            </form>
            <form action={skipGiveback}>
              <input type="hidden" name="id" value={thread.id} />
              <button type="submit" className="w-full px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 whitespace-nowrap">
                Skip
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

function Stat({label, value, accent, success, muted}) {
  let cls = 'border-slate-200';
  let textCls = '';
  if (accent) cls = 'border-primary';
  else if (success) cls = 'border-emerald-300';
  else if (muted) { cls = 'border-slate-200 bg-slate-50'; textCls = 'text-slate-400'; }
  return (
    <div className={`bg-white rounded-xl border ${cls} p-4`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textCls}`}>{value}</p>
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
      <p className="font-medium text-slate-900">No giveback threads in this view</p>
      <p className="text-sm text-slate-500 mt-1">
        Cron runs daily at 3am UTC. Or run manually:{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">node --env-file=.env.local scripts/run-giveback-discovery.js</code>
      </p>
    </div>
  );
}
