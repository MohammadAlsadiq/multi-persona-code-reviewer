/**
 * DiffInput — textarea + sample loader for pasting a unified diff.
 */
import React, { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DiffInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  /** Optional per-request credential overrides */
  apiKey: string;
  baseUrl: string;
  model: string;
  onApiKeyChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
  onModelChange: (v: string) => void;
}

export default function DiffInput({
  value,
  onChange,
  onSubmit,
  loading,
  apiKey,
  baseUrl,
  model,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
}: DiffInputProps) {
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesMap, setSamplesMap] = useState<Record<string, string> | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  async function loadSamples() {
    if (samplesMap) return;
    setSamplesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/samples`);
      if (!res.ok) throw new Error("Failed to load samples");
      const data: Record<string, string> = await res.json();
      setSamplesMap(data);
    } catch {
      alert("Could not load sample patches. Is the backend running?");
    } finally {
      setSamplesLoading(false);
    }
  }

  function loadSample(content: string) {
    onChange(content);
  }

  const sampleNames = samplesMap ? Object.keys(samplesMap) : [];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold text-gray-800">Unified Diff Input</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadSamples}
            disabled={samplesLoading}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {samplesLoading ? "Loading…" : "Load samples ↓"}
          </button>
          <button
            type="button"
            onClick={() => setShowCredentials((s) => !s)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            {showCredentials ? "Hide credentials" : "Override credentials"}
          </button>
        </div>
      </div>

      {/* Sample buttons */}
      {samplesMap && (
        <div className="flex gap-2 flex-wrap">
          {sampleNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => loadSample(samplesMap[name])}
              className="text-xs px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-dark transition"
            >
              {name.replace(/\.patch$/, "").replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Credential overrides */}
      {showCredentials && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-… (leave blank for .env)"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="https://api.groq.com/openai/v1"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="llama-3.3-70b-versatile"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder={"Paste your unified diff here…\n\ndiff --git a/example.py b/example.py\n--- a/example.py\n+++ b/example.py\n@@ -1,5 +1,5 @@\n ..."}
        className="w-full font-mono text-xs leading-5 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y bg-gray-50"
      />

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="px-5 py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Reviewing…
            </span>
          ) : (
            "Run Review →"
          )}
        </button>
      </div>
    </section>
  );
}
