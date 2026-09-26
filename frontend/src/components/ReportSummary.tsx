/**
 * ReportSummary — health score SVG ring + issue count breakdown.
 * Theme-aware: ring track uses CSS var, stat labels use semantic classes.
 */
import React from "react";

interface ReportSummaryProps {
  healthScore: number;
  totalIssues: number;
  securityCount: number;
  performanceCount: number;
  architectureCount: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const fillColor = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={radius} fill="none"
        stroke={fillColor} strokeWidth="10"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ReportSummary({
  healthScore, totalIssues, securityCount, performanceCount, architectureCount,
}: ReportSummaryProps) {
  const scoreColor =
    healthScore >= 80 ? "text-green-500" :
    healthScore >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <section className="card shadow-sm p-6">
      <h2 className="text-base font-semibold text-primary mb-5">Review Summary</h2>
      <div className="flex flex-wrap items-center gap-8">
        {/* Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <ScoreRing score={healthScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>{healthScore}</span>
            <span className="text-xs text-muted">/ 100</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-0">
          <StatCell label="Total Issues"  value={totalIssues}       color="text-primary" />
          <StatCell label="Security"      value={securityCount}     color="text-red-500" />
          <StatCell label="Performance"   value={performanceCount}  color="text-amber-500" />
          <StatCell label="Architecture"  value={architectureCount} color="text-purple-500" />
        </div>
      </div>
    </section>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-muted mt-0.5">{label}</span>
    </div>
  );
}
