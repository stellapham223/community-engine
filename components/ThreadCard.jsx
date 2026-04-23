import Link from 'next/link';

const PLATFORM_LABEL = {
  reddit: 'Reddit',
  shopify_community: 'Shopify Community',
  twitter: 'X/Twitter',
};

const STATUS_BADGE = {
  new: {label: 'New', cls: 'bg-blue-100 text-blue-800'},
  suggested: {label: 'Drafts ready', cls: 'bg-amber-100 text-amber-800'},
  engaged: {label: 'Engaged ✓', cls: 'bg-emerald-100 text-emerald-800'},
  skipped: {label: 'Skipped', cls: 'bg-slate-100 text-slate-600'},
  expired: {label: 'Expired', cls: 'bg-slate-100 text-slate-500'},
};

const FRESHNESS_BADGE = {
  hot: {label: '🔥 Hot', cls: 'bg-red-100 text-red-700'},
  warm: {label: '🌤 Warm', cls: 'bg-amber-50 text-amber-700'},
  cold: {label: '❄️ Cold', cls: 'bg-slate-100 text-slate-500'},
};

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ThreadCard({thread}) {
  const meta = thread.metadata || {};
  const status = STATUS_BADGE[thread.status] || STATUS_BADGE.new;
  const subreddit = meta.subreddit ? `r/${meta.subreddit}` : null;

  return (
    <Link href={`/threads/${thread.id}`}
          className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-primary hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-medium text-slate-700">{PLATFORM_LABEL[thread.platform]}</span>
            {subreddit && <><span>·</span><span>{subreddit}</span></>}
            <span>·</span>
            <span>{relativeTime(thread.posted_at || thread.discovered_at)}</span>
            {thread.topic_name && <><span>·</span><span className="truncate">{thread.topic_name}</span></>}
          </div>
          <h3 className="font-medium text-slate-900 line-clamp-2">{thread.title}</h3>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {thread.freshness_band && FRESHNESS_BADGE[thread.freshness_band] && (
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${FRESHNESS_BADGE[thread.freshness_band].cls}`}>
              {FRESHNESS_BADGE[thread.freshness_band].label}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
        <div className="flex items-center gap-3">
          {meta.upvotes != null && <span>↑ {meta.upvotes}</span>}
          {(meta.num_comments != null || meta.replies != null) && (
            <span>💬 {meta.num_comments ?? meta.replies}</span>
          )}
          {thread.matched_keywords?.length > 0 && (
            <span className="text-slate-400">"{thread.matched_keywords[0]}"</span>
          )}
        </div>
        <span className="text-slate-400">#{thread.id}</span>
      </div>
    </Link>
  );
}
