import { useMemo, useState } from "react";
import DiffInput from "@/components/DiffInput";
import PersonaFilter from "@/components/PersonaFilter";
import FindingCard from "@/components/FindingCard";
import FixSuggestionModal from "@/components/FixSuggestionModal";
import ReportSummary from "@/components/ReportSummary";
import { reviewDiff, ReviewApiError } from "@/lib/api";
import type { Finding, PersonaFilterValue, ReviewReport } from "@/lib/types";

export default function Home() {
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PersonaFilterValue>("ALL");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const handleSubmit = async (diffText: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await reviewDiff(diffText);
      setReport(result);
      setFilter("ALL");
    } catch (err) {
      setError(err instanceof ReviewApiError ? err.message : "Unexpected error running the review.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const findings = useMemo<Finding[]>(() => {
    if (!report) return [];
    if (filter === "ALL") return [...report.security, ...report.performance, ...report.architecture];
    if (filter === "SECURITY") return report.security;
    if (filter === "PERFORMANCE") return report.performance;
    return report.architecture;
  }, [report, filter]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Multi-Persona Code Reviewer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paste a unified Git diff to get concurrent Security, Performance, and Architecture reviews.
        </p>
      </header>

      <section className="mb-8">
        <DiffInput onSubmit={handleSubmit} isLoading={isLoading} />
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {report && (
        <section className="flex flex-col gap-5">
          <ReportSummary report={report} />
          <PersonaFilter report={report} active={filter} onChange={setFilter} />

          {findings.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No findings in this category. Nice work.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {findings.map((finding, idx) => (
                <FindingCard key={idx} finding={finding} onViewFix={setSelectedFinding} />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedFinding && (
        <FixSuggestionModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}
    </div>
  );
}
