import type { Finding } from "@/lib/types";

interface FindingCardProps {
  finding: Finding;
  onViewFix: (finding: Finding) => void;
}

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  CRITICAL: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  WARNING: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  INFO: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

const CATEGORY_LABELS: Record<Finding["category"], string> = {
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  ARCHITECTURE: "Architecture",
};

export default function FindingCard({ finding, onViewFix }: FindingCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[finding.severity]}`}
        >
          {finding.severity}
        </span>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
          {CATEGORY_LABELS[finding.category]}
        </span>
        <span className="font-mono text-xs text-slate-500">
          {finding.file}:{finding.line_number}
        </span>
      </div>

      <p className="text-sm text-slate-100">{finding.issue}</p>
      <p className="mt-1 text-sm text-slate-400">{finding.suggestion}</p>

      {finding.patch && (
        <button
          onClick={() => onViewFix(finding)}
          className="mt-3 rounded-md border border-indigo-500/50 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"
        >
          Apply AI Suggestion
        </button>
      )}
    </div>
  );
}
