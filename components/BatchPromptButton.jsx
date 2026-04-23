'use client';
import {useState} from 'react';

export default function BatchPromptButton({threads}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (threads.length === 0) return null;

  const prompt = buildPrompt(threads);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm">
        ✨ Generate drafts for {threads.length} new thread{threads.length === 1 ? '' : 's'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Batch analysis prompt</h2>
                <p className="text-xs text-slate-500 mt-0.5">Copy → paste into Claude Code → MCP tools will generate + save drafts</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs whitespace-pre-wrap font-mono text-slate-800">
                {prompt}
              </pre>
            </div>

            <div className="p-5 border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Drafts generated in Claude Code session — no API cost
              </p>
              <button onClick={copy}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        copied ? 'bg-emerald-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
                      }`}>
                {copied ? '✓ Copied' : 'Copy prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function buildPrompt(threads) {
  const ids = threads.map(t => t.id).join(', ');
  const list = threads.map(t => {
    const sub = t.metadata?.subreddit ? `r/${t.metadata.subreddit}` : t.platform;
    return `- #${t.id} [${sub}] ${t.title}`;
  }).join('\n');

  return `Use the joy-community MCP server to analyze and draft replies for these ${threads.length} new community threads:

${list}

For EACH thread:
1. Call community_get_thread(thread_id) to fetch full content
2. Score relevance using the relevance_scorer_prompt (return 0-10 + reasoning)
3. If score >= 6, generate 3 drafts using comment_generator_prompt:
   - Draft 1 (helpful_only): no Joy mention
   - Draft 2 (helpful_with_joy_mention): help first, mention Joy once if relevant
   - Draft 3 (recommend_alternatives): recommend best app honestly (may not be Joy)
4. Call community_save_suggestions(thread_id, relevance_score, relevance_reasoning, drafts) to persist

Skip threads scoring <6 (mark via direct DB update if needed).

Thread IDs to process: ${ids}

After done, give me a summary: how many got drafts, how many skipped, top mentioned competitors.`;
}
