/**
 * CouncilConsole.tsx
 *
 * Terminal-style "Multi-Agent Review Council Console" — sends one message to
 * all 3 robots simultaneously via POST /api/chat/council and renders each
 * robot's colour-coded reply card in the thread.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Finding } from "./FindingCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CouncilTurn {
  type: "user" | "council";
  userMessage?: string;
  replies?: Array<{ persona: string; reply: string }>;
}

interface CouncilConsoleProps {
  findings: Finding[];
  diffText: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Persona display helpers
// ---------------------------------------------------------------------------

const PERSONA_DISPLAY: Record<
  string,
  { name: string; emoji: string; color: string; ring: string; bubble: string }
> = {
  SECURITY: {
    name: "SecBot",
    emoji: "🔒",
    color: "text-red-400",
    ring: "border-red-700",
    bubble: "bg-red-950/50 border border-red-800/50",
  },
  PERFORMANCE: {
    name: "PerfBot",
    emoji: "⚡",
    color: "text-amber-400",
    ring: "border-amber-700",
    bubble: "bg-amber-950/50 border border-amber-800/50",
  },
  ARCHITECTURE: {
    name: "ArchBot",
    emoji: "🏛️",
    color: "text-purple-400",
    ring: "border-purple-700",
    bubble: "bg-purple-950/50 border border-purple-800/50",
  },
};

const EXAMPLE_PROMPTS = [
  "Which issue should I fix before deploying to production?",
  "Do the performance and architecture fixes conflict with each other?",
  "What's the highest risk in this diff overall?",
  "Give me a prioritised fix order with rationale.",
  "Are there any issues that affect each other?",
];

// ---------------------------------------------------------------------------
// Typing indicator for a single persona
// ---------------------------------------------------------------------------

function TypingDot({ color }: { color: string }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${color} bg-current animate-bounce`}
      style={{ animationDelay: "0ms" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Single reply card in the council thread
// ---------------------------------------------------------------------------

function ReplyCard({ persona, reply }: { persona: string; reply: string }) {
  const display = PERSONA_DISPLAY[persona] ?? {
    name: persona,
    emoji: "🤖",
    color: "text-gray-400",
    ring: "border-gray-700",
    bubble: "bg-gray-900/50 border border-gray-700",
  };

  return (
    <div className={`rounded-xl p-4 space-y-1.5 ${display.bubble}`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold ${display.color}`}>
        <span className="text-sm">{display.emoji}</span>
        {display.name}
      </div>
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{reply}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CouncilConsole({
  findings,
  diffText,
  apiKey,
  baseUrl,
  model,
}: CouncilConsoleProps) {
  const [thread, setThread] = useState<CouncilTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  const submit = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || sending) return;
      setInput("");
      setShowExamples(false);
      setSending(true);

      // Append the user's turn immediately
      setThread((t) => [...t, { type: "user", userMessage: msg }]);

      try {
        const body = {
          message: msg,
          diff_text: diffText,
          findings,
          history: thread.flatMap((t) => {
            if (t.type === "user") {
              return [{ role: "user" as const, content: t.userMessage!, persona: null }];
            }
            // council replies become assistant turns per persona — omit from shared history
            // to keep context focused; only the user turns are sent
            return [];
          }),
          ...(apiKey && { api_key: apiKey }),
          ...(baseUrl && { base_url: baseUrl }),
          ...(model && { model }),
        };

        const res = await fetch(`${API_BASE}/api/chat/council`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Unknown error" }));
          setThread((t) => [
            ...t,
            {
              type: "council",
              replies: [{ persona: "SECURITY", reply: `⚠️ ${err.detail ?? "Request failed"}` }],
            },
          ]);
          return;
        }

        const data: { replies: Array<{ persona: string; reply: string }> } = await res.json();
        setThread((t) => [...t, { type: "council", replies: data.replies }]);
      } catch {
        setThread((t) => [
          ...t,
          {
            type: "council",
            replies: [
              { persona: "SECURITY", reply: "⚠️ Network error. Is the backend running?" },
            ],
          },
        ]);
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [sending, diffText, findings, thread, apiKey, baseUrl, model]
  );

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            🛡️ Multi-Agent Review Council
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ask all three robot personas simultaneously — they reply concurrently.
          </p>
        </div>
        {thread.length > 0 && (
          <button
            type="button"
            onClick={() => setThread([])}
            className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Terminal window */}
      <div className="rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-xl">
        {/* Terminal title bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border-b border-slate-700">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-amber-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-slate-400 font-mono">council-chat — SecBot · PerfBot · ArchBot</span>
        </div>

        {/* Thread */}
        <div
          ref={scrollRef}
          className="min-h-[200px] max-h-[500px] overflow-y-auto p-4 space-y-5"
        >
          {thread.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <p className="text-2xl">🤖🤖🤖</p>
              <p className="text-sm text-gray-400">
                All three robots are standing by. Ask them anything about the diff.
              </p>
              <button
                type="button"
                onClick={() => setShowExamples((s) => !s)}
                className="text-xs text-blue-400 hover:underline mt-1"
              >
                {showExamples ? "Hide examples" : "Show example questions"}
              </button>
              {showExamples && (
                <div className="flex flex-col gap-1.5 mt-1 w-full max-w-md">
                  {EXAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => submit(p)}
                      className="text-xs text-left px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {thread.map((turn, i) => (
            <div key={i} className="space-y-3">
              {turn.type === "user" && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-900/40 border border-blue-800/50 rounded-xl px-4 py-2.5 text-sm text-gray-100">
                    {turn.userMessage}
                  </div>
                </div>
              )}
              {turn.type === "council" && turn.replies && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {turn.replies.map((r) => (
                    <ReplyCard key={r.persona} persona={r.persona} reply={r.reply} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicators */}
          {sending && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["SECURITY", "PERFORMANCE", "ARCHITECTURE"] as const).map((p) => {
                const d = PERSONA_DISPLAY[p];
                return (
                  <div
                    key={p}
                    className={`rounded-xl p-4 ${d.bubble} flex items-center gap-2`}
                  >
                    <span className="text-sm">{d.emoji}</span>
                    <span className={`text-xs font-bold ${d.color}`}>{d.name}</span>
                    <span className="ml-auto flex gap-1">
                      {[0, 1, 2].map((j) => (
                        <span
                          key={j}
                          className={`inline-block w-1.5 h-1.5 rounded-full bg-current ${d.color} animate-bounce`}
                          style={{ animationDelay: `${j * 150}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-800 px-4 py-3 flex gap-2">
          <span className="text-green-400 font-mono text-sm mt-1.5 select-none">›</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit(input)}
            placeholder="Ask all three robots a question…"
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none disabled:opacity-50 font-mono"
          />
          <button
            type="button"
            onClick={() => submit(input)}
            disabled={sending || !input.trim()}
            className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Ask →"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
