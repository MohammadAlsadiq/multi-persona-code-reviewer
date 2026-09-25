import type { PersonaFilterValue, ReviewReport } from "@/lib/types";

interface PersonaFilterProps {
  report: ReviewReport;
  active: PersonaFilterValue;
  onChange: (value: PersonaFilterValue) => void;
}

export default function PersonaFilter({ report, active, onChange }: PersonaFilterProps) {
  const tabs: { value: PersonaFilterValue; label: string; count: number }[] = [
    {
      value: "ALL",
      label: "All",
      count: report.security.length + report.performance.length + report.architecture.length,
    },
    { value: "SECURITY", label: "Security", count: report.security.length },
    { value: "PERFORMANCE", label: "Performance", count: report.performance.length },
    { value: "ARCHITECTURE", label: "Architecture", count: report.architecture.length },
  ];

  return (
    <div className="flex gap-2 border-b border-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.value
              ? "border-b-2 border-indigo-500 text-indigo-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
          <span className="ml-1.5 text-xs text-slate-500">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
