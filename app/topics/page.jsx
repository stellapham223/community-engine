import {getAllTopics} from '../../lib/queries.js';

export const dynamic = 'force-dynamic';

export default async function Topics() {
  const topics = await getAllTopics();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Monitored topics</h1>
      <p className="text-sm text-slate-600">
        Edit via DB directly or use MCP tool <code className="bg-slate-100 px-1 rounded text-xs">community_topics_update</code> from Claude Code.
      </p>

      <div className="space-y-4">
        {topics.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold">{t.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Platforms: {t.platforms.join(', ')}
                  {t.subreddits?.length > 0 && ` · Subreddits: ${t.subreddits.map(s => 'r/' + s).join(', ')}`}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {t.is_active ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="text-sm">
              <p className="text-slate-500 text-xs uppercase mb-1">Keywords ({t.keywords.length})</p>
              <div className="flex flex-wrap gap-1">
                {t.keywords.map(k => (
                  <span key={k} className="px-2 py-0.5 bg-slate-100 rounded text-xs">{k}</span>
                ))}
              </div>
            </div>

            {t.exclude_keywords?.length > 0 && (
              <div className="text-sm mt-3">
                <p className="text-slate-500 text-xs uppercase mb-1">Exclude</p>
                <div className="flex flex-wrap gap-1">
                  {t.exclude_keywords.map(k => (
                    <span key={k} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
