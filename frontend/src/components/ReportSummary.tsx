/**
 * ReportSummary — health score ring and issue count breakdown.
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
  const color =
    score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      {/* Progress */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ReportSummary({
  healthScore,
  totalIssues,
  securityCount,
  performanceCount,
  architectureCount,
}: ReportSummaryProps) {
  const scoreColor =
    healthScore >= 80
      ? "text-green-600"
      : healthScore >= 50
      ? "text-amber-500"
      : "text-red-600";

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-5">Review Summary</h2>

      <div className="flex flex-wrap items-center gap-8">
        {/* Score ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <ScoreRing score={healthScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>{healthScore}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-0">
          <StatCell label="Total Issues" value={totalIssues} color="text-gray-700" />
          <StatCell label="Security" value={securityCount} color="text-red-600" />
          <StatCell label="Performance" value={performanceCount} color="text-amber-600" />
          <StatCell label="Architecture" value={architectureCount} color="text-purple-600" />
        </div>
      </div>
    </section>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}
