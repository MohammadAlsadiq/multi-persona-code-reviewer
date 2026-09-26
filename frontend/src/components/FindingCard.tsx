/**
 * FindingCard — renders a single Finding with severity badge, category tag,
 * file/line info, and a button to open the fix preview modal.
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
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200",
  INFO: "bg-blue-100 text-blue-700 border-blue-200",
};

const CATEGORY_STYLES: Record<Finding["category"], string> = {
  SECURITY: "bg-red-50 text-red-600",
  PERFORMANCE: "bg-amber-50 text-amber-600",
  ARCHITECTURE: "bg-purple-50 text-purple-600",
};

const SEVERITY_DOT: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-500",
  WARNING: "bg-amber-500",
  INFO: "bg-blue-400",
};

export default function FindingCard({ finding, onShowFix }: FindingCardProps) {
  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
      {/* Top row — severity + category + location */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[finding.severity]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[finding.severity]}`} />
          {finding.severity}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[finding.category]}`}
        >
          {finding.category}
        </span>
        <span className="ml-auto text-xs text-gray-400 font-mono truncate max-w-[220px]">
          {finding.file}
          <span className="text-gray-300 mx-0.5">:</span>
          <span className="text-gray-500">{finding.line_number}</span>
        </span>
      </div>

      {/* Issue */}
      <p className="text-sm font-semibold text-gray-800 leading-snug">{finding.issue}</p>

      {/* Suggestion */}
      <p className="text-sm text-gray-500 leading-relaxed">{finding.suggestion}</p>

      {/* Action */}
      {finding.patch && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onShowFix(finding)}
            className="text-xs font-medium text-brand hover:text-brand-dark underline underline-offset-2 transition"
          >
            View fix preview →
          </button>
        </div>
      )}
    </article>
  );
}
