import {getOverallStats, getTopCompetitors} from '../../lib/queries.js';

export const dynamic = 'force-dynamic';

export default async function Stats({searchParams}) {
  const sp = await searchParams;
  const days = parseInt(sp?.days || '30', 10);

  const [{overall, byPlatform, recentDigests}, competitors] = await Promise.all([
    getOverallStats(days),
    getTopCompetitors(days),
  ]);

  const engagementRate = overall.total > 0
    ? Math.round((overall.engaged_count / overall.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics — last {days} days</h1>
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map(d => (
            <a key={d} href={`/stats?days=${d}`}
               className={`px-3 py-1 rounded ${days === d ? 'bg-primary text-white' : 'bg-white border border-slate-200'}`}>
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Threads scanned" value={overall.total} />
        <StatCard label="Drafts generated" value={overall.analyzed_count} />
        <StatCard label="Engaged" value={overall.engaged_count} success />
        <StatCard label="Engagement rate" value={`${engagementRate}%`} accent />
      </div>

      {/* Platform breakdown */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold mb-3">By platform</h2>
        {byPlatform.length === 0 ? (
          <p className="text-sm text-slate-500">No data</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2">Platform</th>
                <th className="py-2 text-right">Threads</th>
                <th className="py-2 text-right">Engaged</th>
                <th className="py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {byPlatform.map(p => (
                <tr key={p.platform} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{p.platform.replaceAll('_', ' ')}</td>
                  <td className="py-2 text-right">{p.n}</td>
                  <td className="py-2 text-right">{p.engaged}</td>
                  <td className="py-2 text-right">
                    {p.n > 0 ? Math.round((p.engaged / p.n) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Top competitors */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold mb-3">Top competitors mentioned</h2>
        {competitors.length === 0 ? (
          <p className="text-sm text-slate-500">No competitor mentions yet</p>
        ) : (
          <ul className="space-y-2">
            {competitors.map(c => (
              <li key={c.competitor} className="flex items-center justify-between text-sm py-1">
                <span className="font-medium">{c.competitor}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-primary"
                         style={{width: `${(c.mentions / Math.max(...competitors.map(x => x.mentions))) * 100}%`}} />
                  </div>
                  <span className="text-slate-500 w-8 text-right">{c.mentions}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent digests */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold mb-3">Recent daily digests</h2>
        {recentDigests.length === 0 ? (
          <p className="text-sm text-slate-500">No digests yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Scanned</th>
                <th className="py-2 text-right">Filtered in</th>
              </tr>
            </thead>
            <tbody>
              {recentDigests.map(d => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="py-2">{new Date(d.digest_date).toLocaleDateString()}</td>
                  <td className="py-2 text-right">{d.threads_scanned}</td>
                  <td className="py-2 text-right">{d.threads_filtered_in}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({label, value, accent, success}) {
  const cls = accent ? 'border-primary' : success ? 'border-emerald-300' : 'border-slate-200';
  return (
    <div className={`bg-white rounded-xl border ${cls} p-4`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
