import {getTeamAccounts, getLatestKarma, getKarmaTrend} from '../../lib/queries.js';

export const dynamic = 'force-dynamic';

export default async function ReputationPage() {
  const [accounts, latest] = await Promise.all([
    getTeamAccounts(),
    getLatestKarma(),
  ]);

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  // Pull 90-day trend per account in parallel
  const trends = await Promise.all(
    accounts.map(a => getKarmaTrend(a.id, 90).then(rows => ({account_id: a.id, rows}))),
  );
  const trendMap = Object.fromEntries(trends.map(t => [t.account_id, t.rows]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Reputation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Karma + trust-level trends. Reddit accounts unlock free posting after 100 karma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {latest.map(a => {
          const trend = trendMap[a.id] || [];
          return <AccountCard key={a.id} account={a} trend={trend} />;
        })}
      </div>
    </div>
  );
}

function AccountCard({account, trend}) {
  const isReddit = account.platform === 'reddit';
  const value = isReddit ? account.total_karma : account.trust_level;
  const valueLabel = isReddit ? 'karma' : 'trust level';

  let delta = null;
  if (trend.length >= 2) {
    const first = isReddit ? trend[0].total_karma : trend[0].trust_level;
    const last = isReddit ? trend[trend.length - 1].total_karma : trend[trend.length - 1].trust_level;
    if (first != null && last != null) delta = last - first;
  }

  const passedThreshold = isReddit && value != null && value >= 100;

  return (
    <article className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{account.platform}</p>
          <h3 className="font-semibold text-slate-900">
            {account.person_name}
            {account.is_primary && <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">primary</span>}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">@{account.username}</p>
        </div>
        {passedThreshold && (
          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">100+ karma ✓</span>
        )}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{value ?? '—'}</span>
        <span className="text-xs text-slate-500">{valueLabel}</span>
        {delta != null && (
          <span className={`text-xs font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {delta > 0 ? '+' : ''}{delta} (90d)
          </span>
        )}
      </div>

      {isReddit && account.link_karma != null && (
        <div className="text-xs text-slate-500 mt-2">
          {account.link_karma} link · {account.comment_karma} comment
        </div>
      )}

      {account.account_age_days != null && (
        <div className="text-xs text-slate-400 mt-1">
          Account age: {Math.floor(account.account_age_days / 365)}y {account.account_age_days % 365}d
        </div>
      )}

      <div className="mt-4">
        <Sparkline data={trend} field={isReddit ? 'total_karma' : 'trust_level'} />
      </div>
    </article>
  );
}

function Sparkline({data, field}) {
  const points = data.filter(d => d[field] != null);
  if (points.length < 2) {
    return <div className="text-xs text-slate-400 italic">Not enough data — needs 2+ snapshots</div>;
  }

  const values = points.map(p => p[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 280;
  const h = 50;

  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p[field] - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={path} fill="none" stroke="rgb(99 102 241)" strokeWidth="2" />
      <text x="0" y={h + 12} className="text-[10px] fill-slate-400">{points[0].snapshot_date.toString().slice(0, 10)}</text>
      <text x={w} y={h + 12} textAnchor="end" className="text-[10px] fill-slate-400">{points[points.length - 1].snapshot_date.toString().slice(0, 10)}</text>
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="text-center bg-white rounded-xl border border-slate-200 p-12">
      <p className="text-4xl mb-3">📈</p>
      <p className="font-medium text-slate-900">No team accounts seeded yet</p>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Set <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">TEAM_ACCOUNTS_REDDIT</code> + <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">TEAM_ACCOUNTS_SHOPIFY</code> in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env.local</code>, then run:
      </p>
      <pre className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 inline-block text-left">
{`node --env-file=.env.local db/seed-team-accounts.js`}
      </pre>
    </div>
  );
}
