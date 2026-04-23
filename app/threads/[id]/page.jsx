import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getThreadById, getSuggestionsForThread, getEngagementsForThread} from '../../../lib/queries.js';
import {markEngaged} from './actions.js';

export const dynamic = 'force-dynamic';

const PLATFORM_LABEL = {
  reddit: 'Reddit',
  shopify_community: 'Shopify Community',
  twitter: 'X/Twitter',
};

export default async function ThreadDetail({params}) {
  const {id} = await params;
  const thread = await getThreadById(id);
  if (!thread) notFound();

  const [suggestions, engagements] = await Promise.all([
    getSuggestionsForThread(id),
    getEngagementsForThread(id),
  ]);

  const meta = thread.metadata || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/" className="text-sm text-primary hover:underline">← Back to threads</Link>

      {/* Thread header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-medium">{PLATFORM_LABEL[thread.platform]}</span>
              {meta.subreddit && <><span>·</span><span>r/{meta.subreddit}</span></>}
              {thread.posted_at && <><span>·</span><span>{new Date(thread.posted_at).toLocaleDateString()}</span></>}
            </div>
            <h1 className="text-xl font-semibold">{thread.title}</h1>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${
            thread.status === 'engaged' ? 'bg-emerald-100 text-emerald-800' :
            thread.status === 'suggested' ? 'bg-amber-100 text-amber-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {thread.status}
          </span>
        </div>

        <a href={thread.url} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open original ↗
        </a>

        {thread.body && (
          <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap line-clamp-6 border-t border-slate-100 pt-3">
            {thread.body}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
          {meta.upvotes != null && <span>↑ {meta.upvotes} upvotes</span>}
          {(meta.num_comments != null || meta.replies != null) && <span>💬 {meta.num_comments ?? meta.replies} replies</span>}
          {thread.matched_keywords?.length > 0 && (
            <span>Matched: {thread.matched_keywords.map(k => `"${k}"`).join(', ')}</span>
          )}
        </div>

        {thread.relevance_score != null && (
          <div className="mt-3 text-sm">
            <span className="font-medium">Relevance:</span> {thread.relevance_score}/10
            {thread.relevance_reasoning && <p className="text-slate-600 mt-1">{thread.relevance_reasoning}</p>}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Suggested drafts</h2>
          {suggestions.map(s => <DraftCard key={s.id} suggestion={s} threadId={id} />)}
        </section>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm">
          <p className="font-medium text-amber-900 mb-1">No drafts yet</p>
          <p className="text-amber-800">
            Open Claude Code → ask: <code className="bg-white px-1.5 py-0.5 rounded text-xs">analyze community thread #{thread.id}</code>
          </p>
        </div>
      )}

      {/* Engagements history */}
      {engagements.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Engagement history</h2>
          {engagements.map(e => (
            <div key={e.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <p><strong>{e.posted_by}</strong> posted {new Date(e.posted_at).toLocaleString()}
                {e.suggestion_id && <span> using draft #{e.suggestion_id}</span>}</p>
              {e.notes && <p className="text-slate-700 mt-1">{e.notes}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function DraftCard({suggestion, threadId}) {
  const toneCls = {
    helpful_only: 'bg-slate-100 text-slate-700',
    helpful_with_joy_mention: 'bg-blue-100 text-blue-800',
    recommend_alternatives: 'bg-purple-100 text-purple-800',
  }[suggestion.tone] || 'bg-slate-100';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Draft {suggestion.draft_number}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${toneCls}`}>{suggestion.tone.replaceAll('_', ' ')}</span>
        </div>
        <span className="text-xs text-slate-500">{suggestion.word_count} words</span>
      </div>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{suggestion.comment_text}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          {suggestion.mentions_joy ? '✓ Mentions Joy' : 'No Joy mention'}
          {suggestion.mentions_competitors?.length > 0 && (
            <span> · Mentions: {suggestion.mentions_competitors.join(', ')}</span>
          )}
        </div>
        <form action={markEngaged}>
          <input type="hidden" name="thread_id" value={threadId} />
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <button type="submit"
                  className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90">
            I posted this
          </button>
        </form>
      </div>
    </div>
  );
}
