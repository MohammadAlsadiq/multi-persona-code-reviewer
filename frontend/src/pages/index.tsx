/**
 * index.tsx — Main dashboard page for the Multi-Persona Code Reviewer.
 *
 * Orchestrates:
 *   - DiffInput (textarea + credential overrides + sample loader)
 *   - POST /api/review → ReviewReport
 *   - ReportSummary (health score ring + issue counts)
 *   - PersonaFilter (chip toggles)
 *   - FindingCard list
 *   - FixSuggestionModal (fix preview overlay via /api/apply-fix)
 */
import React, { useState, useCallback } from "react";
import type { NextPage } from "next";

import DiffInput from "@/components/DiffInput";
import PersonaFilter, { type Persona } from "@/components/PersonaFilter";
import FindingCard, { type Finding } from "@/components/FindingCard";
import FixSuggestionModal from "@/components/FixSuggestionModal";
import ReportSummary from "@/components/ReportSummary";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReviewReport {
  security: Finding[];
  performance: Finding[];
  architecture: Finding[];
  health_score: number;
  total_issues: number;
}

const ALL_PERSONAS: Persona[] = ["SECURITY", "PERFORMANCE", "ARCHITECTURE"];

const Home: NextPage = () => {
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
        // Don't allow deselecting the last active persona
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
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
              d="M9 12h6m-6 4h6m-6-8h6M5 7h.01M5 12h.01M5 17h.01M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z"
            />
          </svg>
          <h1 className="text-sm font-semibold text-gray-800 truncate">
            Multi-Persona Code Reviewer
          </h1>
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            IBM Bob 2.0 Hackathon
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Diff input + submit */}
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

        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-gray-200 animate-pulse"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {report && !loading && (
          <>
            {/* Summary */}
            <ReportSummary
              healthScore={report.health_score}
              totalIssues={report.total_issues}
              securityCount={report.security.length}
              performanceCount={report.performance.length}
              architectureCount={report.architecture.length}
            />

            {/* Findings section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-800">
                  Findings
                  <span className="ml-2 text-gray-400 font-normal text-sm">
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
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
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
          </>
        )}

        {/* Empty state — before first review */}
        {!report && !loading && !error && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-400 space-y-2">
            <p className="text-base font-medium text-gray-500">
              Paste a unified diff above and click{" "}
              <span className="font-semibold text-brand">Run Review</span>
            </p>
            <p>
              Three AI personas — Security, Performance, Architecture — will review it
              in parallel.
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
