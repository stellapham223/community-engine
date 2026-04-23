import {getRevisitAlerts} from '../../lib/queries.js';
import {resolveAlert} from './actions.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ALERT_LABELS = {
  new_reply: {emoji: '💬', label: 'New reply', cls: 'bg-blue-100 text-blue-700'},
  gained_traction: {emoji: '📈', label: 'Gained traction', cls: 'bg-emerald-100 text-emerald-700'},
  followup_question: {emoji: '❓', label: 'Follow-up question', cls: 'bg-amber-100 text-amber-700'},
};

export default async function RevisitPage({searchParams}) {
  const sp = await searchParams;
  const showAll = sp?.show === 'all';
  const alerts = await getRevisitAlerts({includeResolved: showAll, limit: 100});
  const unresolvedCount = showAll ? alerts.filter(a => !a.resolved).length : alerts.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔁 Revisit Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Engaged threads that gained new replies or traction. Weekly cron checks every Monday.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <FilterPill href="/revisit" active={!showAll}>Unresolved ({unresolvedCount})</FilterPill>
        <FilterPill href="/revisit?show=all" active={showAll}>All</FilterPill>
      </div>

      {alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}
    </div>
  );
}

function AlertCard({alert}) {
  const meta = ALERT_LABELS[alert.alert_type] || {emoji: '🔔', label: alert.alert_type, cls: 'bg-slate-100 text-slate-700'};
  const details = alert.details || {};

  return (
    <article className={`bg-white rounded-xl border ${alert.resolved ? 'border-slate-200 opacity-50' : 'border-slate-200'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
            <span className={`px-2 py-0.5 rounded font-medium ${meta.cls}`}>{meta.emoji} {meta.label}</span>
            <span>·</span>
            <span>{new Date(alert.created_at).toLocaleDateString()}</span>
          </div>
          <a href={alert.thread_url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-primary block">
            {alert.thread_title}
          </a>
          {alert.alert_type === 'new_reply' && details.new_count && (
            <p className="text-sm text-slate-600 mt-2">+{details.new_count} new repl{details.new_count === 1 ? 'y' : 'ies'} since last check</p>
          )}
          {alert.alert_type === 'gained_traction' && (
            <p className="text-sm text-slate-600 mt-2">Upvotes: {details.from} → {details.to}</p>
          )}
          {alert.alert_type === 'followup_question' && details.author && (
            <p className="text-sm text-slate-600 mt-2">u/{details.author} asked a follow-up</p>
          )}
        </div>
        {!alert.resolved && (
          <form action={resolveAlert}>
            <input type="hidden" name="id" value={alert.id} />
            <button type="submit" className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap">
              ✓ Resolve
            </button>
          </form>
        )}
      </div>
    </article>
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
      <p className="text-4xl mb-3">🌳</p>
      <p className="font-medium text-slate-900">No revisit alerts</p>
      <p className="text-sm text-slate-500 mt-1">
        Alerts appear when engaged threads get new replies. Cron runs Mondays 4am UTC.
      </p>
      <p className="text-xs text-slate-400 mt-3">
        Or run manually: <code className="bg-slate-100 px-1.5 py-0.5 rounded">node --env-file=.env.local scripts/run-evergreen-revisit.js</code>
      </p>
    </div>
  );
}
