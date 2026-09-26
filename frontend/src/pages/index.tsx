/**
 * index.tsx — Main dashboard page for the Multi-Persona Code Reviewer.
 *
 * Layout (top → bottom):
 *   1. Sticky topbar
 *   2. DiffInput  (textarea + credential overrides + sample loader)
 *   3. Error banner (if any)
 *   4. Loading skeleton
 *   5. ReportSummary  (health score ring + issue counts)
 *   6. RobotPersonas  (3-column command deck with embedded 1-on-1 mini-chat)
 *   7. CouncilConsole (multi-robot war-room chat)
 *   8. PersonaFilter + FindingCard list
 *   9. FixSuggestionModal (fix preview overlay)
 */
import React, { useState, useCallback } from "react";
import type { NextPage } from "next";

import DiffInput from "@/components/DiffInput";
import PersonaFilter, { type Persona } from "@/components/PersonaFilter";
import FindingCard, { type Finding } from "@/components/FindingCard";
import FixSuggestionModal from "@/components/FixSuggestionModal";
import ReportSummary from "@/components/ReportSummary";
import RobotPersonas from "@/components/RobotPersonas";
import CouncilConsole from "@/components/CouncilConsole";
import { useTheme } from "@/hooks/useTheme";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReviewReport {
  security: Finding[];
  performance: Finding[];
  architecture: Finding[];
  health_score: number;
  total_issues: number;
}

const ALL_PERSONAS: Persona[] = ["SECURITY", "PERFORMANCE", "ARCHITECTURE"];

// ── Moon / Sun SVG icons ──────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

const Home: NextPage = () => {
  const { isDark, toggle } = useTheme();

  // -- Input state -----------------------------------------------------------
  const [diffText, setDiffText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  // -- Review state ----------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReviewReport | null>(null);

  // -- UI state --------------------------------------------------------------
  const [activePersonas, setActivePersonas] = useState<Set<Persona>>(
    new Set(ALL_PERSONAS)
  );
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // -- Run review ------------------------------------------------------------
  const runReview = useCallback(async () => {
    if (!diffText.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const body: Record<string, string> = { diff_text: diffText };
      if (apiKey) body.api_key = apiKey;
      if (baseUrl) body.base_url = baseUrl;
      if (model) body.model = model;

      const res = await fetch(`${API_BASE}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      const data: ReviewReport = await res.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [diffText, apiKey, baseUrl, model]);

  // -- Filter helpers --------------------------------------------------------
  function togglePersona(p: Persona) {
    setActivePersonas((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev;
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  const allFindings: Finding[] = report
    ? [
        ...(activePersonas.has("SECURITY") ? report.security : []),
        ...(activePersonas.has("PERFORMANCE") ? report.performance : []),
        ...(activePersonas.has("ARCHITECTURE") ? report.architecture : []),
      ]
    : [];

  const counts: Record<Persona, number> = report
    ? {
        SECURITY: report.security.length,
        PERFORMANCE: report.performance.length,
        ARCHITECTURE: report.architecture.length,
      }
    : { SECURITY: 0, PERFORMANCE: 0, ARCHITECTURE: 0 };

  const allFindingsFlat: Finding[] = report
    ? [...report.security, ...report.performance, ...report.architecture]
    : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-40 shadow-sm"
        style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <svg
            className="h-6 w-6 text-brand shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <h1 className="text-sm font-semibold text-primary truncate">
            Multi-Persona Code Reviewer
          </h1>
          <span className="ml-auto text-xs text-muted hidden sm:block">
            IBM Bob 2.0 · SecBot · PerfBot · ArchBot
          </span>
          {/* Dark/light toggle */}
          <button
            type="button"
            onClick={toggle}
            className="theme-toggle"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 transition-colors duration-200">
        {/* ── 1. Diff input ─────────────────────────────────────────── */}
        <DiffInput
          value={diffText}
          onChange={setDiffText}
          onSubmit={runReview}
          loading={loading}
          apiKey={apiKey}
          baseUrl={baseUrl}
          model={model}
          onApiKeyChange={setApiKey}
          onBaseUrlChange={setBaseUrl}
          onModelChange={setModel}
        />

        {/* ── 2. Error banner ───────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 px-5 py-4 text-sm text-red-700 dark:text-red-300">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
        )}

        {/* ── 3. Loading skeleton ───────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl animate-pulse"
                style={{ opacity: 1 - i * 0.25, backgroundColor: "var(--bg-card-alt)" }}
              />
            ))}
          </div>
        )}

        {/* ── Results (only after review) ───────────────────────────── */}
        {(report || loading) && (
          <>
            {/* ── 4. Summary ──────────────────────────────────────────── */}
            {report && !loading && (
              <ReportSummary
                healthScore={report.health_score}
                totalIssues={report.total_issues}
                securityCount={report.security.length}
                performanceCount={report.performance.length}
                architectureCount={report.architecture.length}
              />
            )}

            {/* ── 5. Robot Command Deck (shown while scanning too) ────── */}
            <RobotPersonas
              report={report}
              scanning={loading}
              diffText={diffText}
              apiKey={apiKey || undefined}
              baseUrl={baseUrl || undefined}
              model={model || undefined}
            />

            {/* ── 6. Council Console ──────────────────────────────────── */}
            {report && !loading && (
              <CouncilConsole
                findings={allFindingsFlat}
                diffText={diffText}
                apiKey={apiKey || undefined}
                baseUrl={baseUrl || undefined}
                model={model || undefined}
              />
            )}

            {/* ── 7. Finding cards (filtered) ─────────────────────────── */}
            {report && !loading && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-gray-200">
                    All Findings
                    <span className="ml-2 text-gray-500 font-normal text-sm">
                      ({allFindings.length} shown)
                    </span>
                  </h2>
                  <PersonaFilter
                    active={activePersonas}
                    counts={counts}
                    onChange={togglePersona}
                  />
                </div>

                {allFindings.length === 0 ? (
                  <div className="card-alt p-10 text-center text-sm text-muted">
                    No findings for the selected personas.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allFindings.map((f, i) => (
                      <FindingCard
                        key={`${f.category}-${i}`}
                        finding={f}
                        onShowFix={setSelectedFinding}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!report && !loading && !error && (
          <div
            className="rounded-xl border-2 border-dashed p-12 text-center space-y-3"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card-alt)" }}
          >
            <p className="text-3xl">🤖⚡🏛️</p>
            <p className="text-base font-medium text-secondary">
              Paste a unified diff above and click{" "}
              <span className="font-semibold" style={{ color: "var(--accent)" }}>Run Review</span>
            </p>
            <p className="text-sm text-muted">
              SecBot, PerfBot, and ArchBot will review in parallel — then you can
              chat with each one individually or convene the full Review Council.
            </p>
          </div>
        )}
      </main>

      {/* Fix preview modal */}
      <FixSuggestionModal
        finding={selectedFinding}
        diffText={diffText}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  );
};

export default Home;
