/**
 * RobotPersonas.tsx
 *
 * 3-column Robot Command Deck showing SecBot 🔒, PerfBot ⚡, and ArchBot 🏛️.
 * Each column contains:
 *   - Animated SVG robot avatar (unique per persona)
 *   - Status badge (Scanning / Alert / All Clear)
 *   - Filtered list of that persona's findings
 *   - Embedded 1-on-1 mini-chat box wired to POST /api/chat/agent
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Finding } from "./FindingCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Persona = "SECURITY" | "PERFORMANCE" | "ARCHITECTURE";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RobotPersonasProps {
  report: {
    security: Finding[];
    performance: Finding[];
    architecture: Finding[];
  } | null;
  scanning: boolean;
  diffText: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Persona config
// ---------------------------------------------------------------------------

const PERSONA_CONFIG = {
  SECURITY: {
    name: "SecBot",
    emoji: "🔒",
    label: "Security",
    tagline: "Vulnerability & Exploit Analysis",
    placeholder: "Ask SecBot about these security issues…",
    headerBg: "bg-red-950/60",
    border: "border-red-800/60",
    accent: "text-red-400",
    avatarStroke: "#ef4444",
    avatarGlow: "#7f1d1d",
    badgeBg: "bg-red-900/80 text-red-300",
    chipBg: "bg-red-900/50 hover:bg-red-800/70 text-red-300 border-red-800",
    bubbleBg: "bg-red-900/30 text-red-100",
    quickChips: [
      "Why is this critical?",
      "How can this be exploited?",
      "Show me a secure fix",
    ],
    getFindings: (r: RobotPersonasProps["report"]) => r?.security ?? [],
  },
  PERFORMANCE: {
    name: "PerfBot",
    emoji: "⚡",
    label: "Performance",
    tagline: "Throughput & Complexity Analysis",
    placeholder: "Ask PerfBot about performance issues…",
    headerBg: "bg-amber-950/60",
    border: "border-amber-800/60",
    accent: "text-amber-400",
    avatarStroke: "#f59e0b",
    avatarGlow: "#78350f",
    badgeBg: "bg-amber-900/80 text-amber-300",
    chipBg: "bg-amber-900/50 hover:bg-amber-800/70 text-amber-300 border-amber-800",
    bubbleBg: "bg-amber-900/30 text-amber-100",
    quickChips: [
      "What's the complexity?",
      "Show me a faster alternative",
      "How bad is this at scale?",
    ],
    getFindings: (r: RobotPersonasProps["report"]) => r?.performance ?? [],
  },
  ARCHITECTURE: {
    name: "ArchBot",
    emoji: "🏛️",
    label: "Architecture",
    tagline: "Design & Maintainability Analysis",
    placeholder: "Ask ArchBot about architecture issues…",
    headerBg: "bg-purple-950/60",
    border: "border-purple-800/60",
    accent: "text-purple-400",
    avatarStroke: "#a855f7",
    avatarGlow: "#3b0764",
    badgeBg: "bg-purple-900/80 text-purple-300",
    chipBg: "bg-purple-900/50 hover:bg-purple-800/70 text-purple-300 border-purple-800",
    bubbleBg: "bg-purple-900/30 text-purple-100",
    quickChips: [
      "Which SOLID principle is violated?",
      "Show me a refactored design",
      "How does this affect maintainability?",
    ],
    getFindings: (r: RobotPersonasProps["report"]) => r?.architecture ?? [],
  },
} as const;

// ---------------------------------------------------------------------------
// SVG Robot Avatars (unique per persona)
// ---------------------------------------------------------------------------

function SecBotAvatar({ stroke, glow }: { stroke: string; glow: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden>
      {/* Head */}
      <rect x="18" y="20" width="44" height="36" rx="8" fill="#1e1e2e" stroke={stroke} strokeWidth="2" />
      {/* Antenna */}
      <line x1="40" y1="20" x2="40" y2="10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="8" r="3" fill={stroke} />
      {/* Visor / shield eyes */}
      <rect x="24" y="30" width="12" height="9" rx="3" fill={glow} stroke={stroke} strokeWidth="1.5" />
      <rect x="44" y="30" width="12" height="9" rx="3" fill={glow} stroke={stroke} strokeWidth="1.5" />
      {/* Shield icon inside left eye */}
      <path d="M28 32 L30 31 L32 32 L32 35 L30 36.5 L28 35 Z" fill={stroke} opacity="0.8" />
      {/* Mouth */}
      <rect x="28" y="44" width="24" height="5" rx="2.5" fill={glow} stroke={stroke} strokeWidth="1.5" />
      {/* Body stub */}
      <rect x="28" y="56" width="24" height="12" rx="4" fill="#1e1e2e" stroke={stroke} strokeWidth="1.5" />
      {/* Chest badge */}
      <path d="M37 59 L40 57.5 L43 59 L43 63 L40 64.5 L37 63 Z" fill={stroke} opacity="0.6" />
    </svg>
  );
}

function PerfBotAvatar({ stroke, glow }: { stroke: string; glow: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden>
      {/* Head — slightly trapezoidal */}
      <path d="M16 24 Q16 18 22 18 L58 18 Q64 18 64 24 L64 54 Q64 60 58 60 L22 60 Q16 60 16 54 Z"
            fill="#1e1e2e" stroke={stroke} strokeWidth="2" />
      {/* Dual antenna */}
      <line x1="30" y1="18" x2="26" y2="9" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="18" x2="54" y2="9" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="7" r="3" fill={stroke} />
      <circle cx="54" cy="7" r="3" fill={stroke} />
      {/* Lightning bolt eyes */}
      <ellipse cx="30" cy="34" rx="7" ry="6" fill={glow} stroke={stroke} strokeWidth="1.5" />
      <ellipse cx="50" cy="34" rx="7" ry="6" fill={glow} stroke={stroke} strokeWidth="1.5" />
      <path d="M28 31 L32 34 L30 34 L33 37" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 31 L52 34 L50 34 L53 37" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      {/* Speed-lines mouth */}
      <line x1="27" y1="48" x2="53" y2="48" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="52" x2="50" y2="52" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function ArchBotAvatar({ stroke, glow }: { stroke: string; glow: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" aria-hidden>
      {/* Hexagonal head */}
      <polygon points="40,12 60,23 60,57 40,68 20,57 20,23" fill="#1e1e2e" stroke={stroke} strokeWidth="2" />
      {/* Blueprint visor eyes — geometric */}
      <rect x="24" y="31" width="13" height="10" rx="2" fill={glow} stroke={stroke} strokeWidth="1.5" />
      <rect x="43" y="31" width="13" height="10" rx="2" fill={glow} stroke={stroke} strokeWidth="1.5" />
      {/* Grid lines inside eyes */}
      <line x1="30.5" y1="31" x2="30.5" y2="41" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
      <line x1="24" y1="36" x2="37" y2="36" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
      <line x1="49.5" y1="31" x2="49.5" y2="41" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
      <line x1="43" y1="36" x2="56" y2="36" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
      {/* Structured mouth */}
      <path d="M28 50 L40 46 L52 50" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="46" r="2" fill={stroke} />
    </svg>
  );
}

const AVATARS = {
  SECURITY: SecBotAvatar,
  PERFORMANCE: PerfBotAvatar,
  ARCHITECTURE: ArchBotAvatar,
};

// ---------------------------------------------------------------------------
// Mini-chat component
// ---------------------------------------------------------------------------

interface MiniChatProps {
  persona: Persona;
  findings: Finding[];
  diffText: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function MiniChat({ persona, findings, diffText, apiKey, baseUrl, model }: MiniChatProps) {
  const cfg = PERSONA_CONFIG[persona];
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, open]);

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || sending) return;
      setInput("");
      setSending(true);
      const userTurn: ChatTurn = { role: "user", content: msg };
      setHistory((h) => [...h, userTurn]);

      try {
        const body = {
          persona,
          message: msg,
          diff_text: diffText,
          findings,
          history: history.map((t) => ({ role: t.role, content: t.content, persona: null })),
          ...(apiKey && { api_key: apiKey }),
          ...(baseUrl && { base_url: baseUrl }),
          ...(model && { model }),
        };
        const res = await fetch(`${API_BASE}/api/chat/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const reply: string = res.ok ? data.reply : `⚠️ ${data.detail ?? "Error"}`;
        setHistory((h) => [...h, { role: "assistant", content: reply }]);
      } catch {
        setHistory((h) => [
          ...h,
          { role: "assistant", content: "⚠️ Network error. Is the backend running?" },
        ]);
      } finally {
        setSending(false);
      }
    },
    [persona, diffText, findings, history, apiKey, baseUrl, model, sending]
  );

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left text-xs font-semibold ${cfg.accent} flex items-center gap-1.5 mb-2`}
      >
        <span className="text-base">{cfg.emoji}</span>
        {open ? "▾" : "▸"} Chat with {cfg.name}
        {history.length > 0 && (
          <span className="ml-auto text-[10px] opacity-60">{Math.ceil(history.length / 2)} turns</span>
        )}
      </button>

      {open && (
        <div className="space-y-2">
          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5">
            {cfg.quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => send(chip)}
                disabled={sending}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition ${cfg.chipBg} disabled:opacity-40`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Conversation thread */}
          {history.length > 0 && (
            <div
              ref={scrollRef}
              className="max-h-48 overflow-y-auto space-y-2 rounded-lg bg-black/30 p-2"
            >
              {history.map((turn, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                    turn.role === "user"
                      ? "bg-white/10 text-gray-200 ml-4"
                      : `${cfg.bubbleBg} mr-4`
                  }`}
                >
                  {turn.role === "assistant" && (
                    <span className="font-bold mr-1">{cfg.name}:</span>
                  )}
                  {turn.content}
                </div>
              ))}
              {sending && (
                <div className={`text-xs rounded-lg px-3 py-2 mr-4 ${cfg.bubbleBg} flex items-center gap-1.5`}>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {cfg.name} is thinking…
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder={cfg.placeholder}
              disabled={sending}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${cfg.chipBg} disabled:opacity-30`}
            >
              ↵
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single robot column
// ---------------------------------------------------------------------------

interface RobotColumnProps {
  persona: Persona;
  findings: Finding[];
  scanning: boolean;
  diffText: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function RobotColumn({
  persona,
  findings,
  scanning,
  diffText,
  apiKey,
  baseUrl,
  model,
}: RobotColumnProps) {
  const cfg = PERSONA_CONFIG[persona];
  const Avatar = AVATARS[persona];
  const count = findings.length;

  const status = scanning
    ? { label: "Scanning…", cls: "bg-blue-900/60 text-blue-300 animate-pulse" }
    : count === 0
    ? { label: "✓ All Clear", cls: "bg-green-900/60 text-green-300" }
    : { label: `⚠ ${count} Issue${count > 1 ? "s" : ""} Found`, cls: `${cfg.badgeBg}` };

  return (
    <div
      className={`flex flex-col rounded-2xl border ${cfg.border} bg-slate-900/70 overflow-hidden`}
    >
      {/* Robot header */}
      <div className={`${cfg.headerBg} px-4 pt-5 pb-4 flex flex-col items-center gap-2`}>
        {/* Avatar */}
        <div className="w-20 h-20 relative">
          <Avatar stroke={cfg.avatarStroke} glow={cfg.avatarGlow} />
        </div>
        {/* Name + emoji */}
        <div className="text-center">
          <p className={`font-bold text-sm ${cfg.accent}`}>
            {cfg.emoji} {cfg.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{cfg.tagline}</p>
        </div>
        {/* Status badge */}
        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Findings list */}
      <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto max-h-64">
        {!scanning && count === 0 && (
          <p className="text-center text-xs text-gray-500 py-4">No findings.</p>
        )}
        {findings.map((f, i) => (
          <div
            key={i}
            className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 space-y-0.5"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  f.severity === "CRITICAL"
                    ? "bg-red-900 text-red-300"
                    : f.severity === "WARNING"
                    ? "bg-amber-900 text-amber-300"
                    : "bg-blue-900 text-blue-300"
                }`}
              >
                {f.severity}
              </span>
              <span className="font-mono text-[9px] text-gray-500 truncate">
                {f.file}:{f.line_number}
              </span>
            </div>
            <p className="text-xs text-gray-200 leading-snug">{f.issue}</p>
          </div>
        ))}
      </div>

      {/* Mini-chat */}
      <div className="px-3 pb-4">
        <MiniChat
          persona={persona}
          findings={findings}
          diffText={diffText}
          apiKey={apiKey}
          baseUrl={baseUrl}
          model={model}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function RobotPersonas({
  report,
  scanning,
  diffText,
  apiKey,
  baseUrl,
  model,
}: RobotPersonasProps) {
  if (!scanning && !report) return null;

  const personas: Persona[] = ["SECURITY", "PERFORMANCE", "ARCHITECTURE"];

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
        🤖 Robot Command Deck
        {scanning && (
          <span className="text-xs font-normal text-blue-400 animate-pulse">
            — agents running…
          </span>
        )}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {personas.map((p) => (
          <RobotColumn
            key={p}
            persona={p}
            findings={PERSONA_CONFIG[p].getFindings(report)}
            scanning={scanning}
            diffText={diffText}
            apiKey={apiKey}
            baseUrl={baseUrl}
            model={model}
          />
        ))}
      </div>
    </section>
  );
}
