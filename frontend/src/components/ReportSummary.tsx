import type { ReviewReport } from "@/lib/types";

interface ReportSummaryProps {
  report: ReviewReport;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

export default function ReportSummary({ report }: ReportSummaryProps) {
  const counts = {
    CRITICAL: 0,
    WARNING: 0,
    INFO: 0,
  };
  for (const finding of [...report.security, ...report.performance, ...report.architecture]) {
    counts[finding.severity] += 1;
  }

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col items-center">
        <span className={`text-4xl font-bold ${scoreColor(report.health_score)}`}>
          {report.health_score}
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-500">Health Score</span>
      </div>

      <div className="h-10 w-px bg-slate-800" />

      <div className="flex flex-col">
        <span className="text-2xl font-semibold text-slate-100">{report.total_issues}</span>
        <span className="text-xs uppercase tracking-wide text-slate-500">Total Findings</span>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-rose-400">{counts.CRITICAL} Critical</span>
        <span className="text-amber-400">{counts.WARNING} Warning</span>
        <span className="text-sky-400">{counts.INFO} Info</span>
      </div>
    </div>
  );
}
