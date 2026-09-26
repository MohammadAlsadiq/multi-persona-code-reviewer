/**
 * FindingCard — severity badge, category tag, file/line, issue, suggestion,
 * "View fix preview →" link. Theme-aware via dark: variants + CSS vars.
 */
import React from "react";

export interface Finding {
  file: string;
  line_number: number;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: "SECURITY" | "PERFORMANCE" | "ARCHITECTURE";
  issue: string;
  suggestion: string;
  patch: string;
}

interface FindingCardProps {
  finding: Finding;
  onShowFix: (finding: Finding) => void;
}

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  WARNING:  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  INFO:     "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
};

const CATEGORY_STYLES: Record<Finding["category"], string> = {
  SECURITY:     "bg-red-50    text-red-600    dark:bg-red-900/30    dark:text-red-400",
  PERFORMANCE:  "bg-amber-50  text-amber-600  dark:bg-amber-900/30  dark:text-amber-400",
  ARCHITECTURE: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const SEVERITY_DOT: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-500",
  WARNING:  "bg-amber-500",
  INFO:     "bg-blue-400",
};

export default function FindingCard({ finding, onShowFix }: FindingCardProps) {
  return (
    <article className="card shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[finding.severity]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[finding.severity]}`} />
          {finding.severity}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[finding.category]}`}>
          {finding.category}
        </span>
        <span className="ml-auto text-xs text-muted font-mono truncate max-w-[220px]">
          {finding.file}
          <span className="opacity-40 mx-0.5">:</span>
          <span className="text-secondary">{finding.line_number}</span>
        </span>
      </div>

      {/* Issue */}
      <p className="text-sm font-semibold text-primary leading-snug">{finding.issue}</p>

      {/* Suggestion */}
      <p className="text-sm text-secondary leading-relaxed">{finding.suggestion}</p>

      {/* Action */}
      {finding.patch && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onShowFix(finding)}
            className="text-xs font-medium text-brand hover:text-brand-dark dark:text-[#58a6ff] dark:hover:text-[#79b8ff] underline underline-offset-2 transition"
          >
            View fix preview →
          </button>
        </div>
      )}
    </article>
  );
}
