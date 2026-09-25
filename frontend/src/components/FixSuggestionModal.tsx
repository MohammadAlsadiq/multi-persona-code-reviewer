import type { Finding } from "@/lib/types";

interface FixSuggestionModalProps {
  finding: Finding;
  onClose: () => void;
}

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-slate-400";
  if (line.startsWith("+")) return "bg-emerald-500/10 text-emerald-300";
  if (line.startsWith("-")) return "bg-rose-500/10 text-rose-300";
  if (line.startsWith("@@")) return "text-indigo-300";
  return "text-slate-300";
}

export default function FixSuggestionModal({ finding, onClose }: FixSuggestionModalProps) {
  const lines = finding.patch.split("\n");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {finding.file}:{finding.line_number}
            </h2>
            <p className="text-xs text-slate-500">{finding.suggestion}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-relaxed">
          {lines.map((line, idx) => (
            <div key={idx} className={diffLineClass(line)}>
              {line || " "}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
