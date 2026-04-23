'use client';
import {useState} from 'react';

export default function GivebackPromptButton({thread}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = buildPrompt(thread);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 whitespace-nowrap"
      >
        ✨ Get reply
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Karma reply prompt</h2>
                <p className="text-xs text-slate-500 mt-0.5">Copy → paste vào Claude Code → Claude generate 1 helpful reply (NO Joy mention)</p>
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
                Pure helpful · 0% Joy · category: <code className="bg-slate-100 px-1 rounded">{thread.category}</code>
              </p>
              <button
                onClick={copy}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function buildPrompt(thread) {
  return `Use the joy-community MCP server to draft a karma reply for this Shopify question (NO Joy mention — pure helpful):

Thread #${thread.id} [${thread.category}/${thread.difficulty}] ${thread.title}
${thread.url}

Steps:
1. Call community_giveback_analyze(${thread.id}) to fetch full content + helpful_prompt
2. Use the helpful_prompt system prompt to draft ONE reply (NOT 3 — just one good one)
3. Output the comment_text in the chat so I can copy + paste manually
4. After I confirm I posted it, call community_giveback_mark_answered(${thread.id}, status='answered')

Constraints to remember:
- ZERO mention of Joy Subscriptions, Avada, joysubscription.com
- 60-180 words, conversational Reddit voice
- Match category framing (${thread.category})
- Suggest specific apps/settings when relevant, not generic advice`;
}
