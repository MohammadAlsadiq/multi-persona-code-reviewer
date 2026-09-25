import { useState } from "react";
import { SAMPLE_DIFFS } from "@/lib/sampleDiffs";

interface DiffInputProps {
  onSubmit: (diffText: string) => void;
  isLoading: boolean;
}

export default function DiffInput({ onSubmit, isLoading }: DiffInputProps) {
  const [diffText, setDiffText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (diffText.trim()) {
      onSubmit(diffText);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor="diff-textarea" className="text-sm font-medium text-slate-300">
          Paste a unified Git diff
        </label>
        <div className="flex gap-2">
          {SAMPLE_DIFFS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setDiffText(sample.diff)}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        id="diff-textarea"
        value={diffText}
        onChange={(e) => setDiffText(e.target.value)}
        placeholder={"diff --git a/file.py b/file.py\n@@ -1,3 +1,3 @@\n..."}
        rows={14}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
      />

      <button
        type="submit"
        disabled={isLoading || !diffText.trim()}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isLoading ? "Reviewing..." : "Run Review"}
      </button>
    </form>
  );
}
