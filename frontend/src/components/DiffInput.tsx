/**
 * DiffInput — textarea + sample loader for pasting a unified diff.
 * Uses CSS-variable-backed semantic classes for dark/light theme support.
 */
import React, { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DiffInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
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

  const sampleNames = samplesMap ? Object.keys(samplesMap) : [];

  return (
    <section className="card shadow-sm p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold text-primary">Unified Diff Input</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadSamples}
            disabled={samplesLoading}
            className="btn-ghost disabled:opacity-50"
          >
            {samplesLoading ? "Loading…" : "Load samples ↓"}
          </button>
          <button
            type="button"
            onClick={() => setShowCredentials((s) => !s)}
            className="btn-ghost"
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
              onClick={() => onChange(samplesMap[name])}
              className="text-xs px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-dark transition"
            >
              {name.replace(/\.patch$/, "").replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Credential overrides */}
      {showCredentials && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg card-alt">
          {[
            { label: "API Key", type: "password", val: apiKey, ph: "sk-… (leave blank for .env)", cb: onApiKeyChange },
            { label: "Base URL", type: "text",     val: baseUrl, ph: "https://api.groq.com/openai/v1", cb: onBaseUrlChange },
            { label: "Model",    type: "text",     val: model,   ph: "llama-3.3-70b-versatile", cb: onModelChange },
          ].map(({ label, type, val, ph, cb }) => (
            <div key={label}>
              <label className="block text-xs text-muted mb-1">{label}</label>
              <input
                type={type}
                value={val}
                onChange={(e) => cb(e.target.value)}
                placeholder={ph}
                className="input-base w-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder={"Paste your unified diff here…\n\ndiff --git a/example.py b/example.py\n--- a/example.py\n+++ b/example.py\n@@ -1,5 +1,5 @@\n ..."}
        className="w-full input-base font-mono text-xs leading-5 resize-y p-3"
        style={{ minHeight: "220px" }}
      />

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="btn-primary shadow-sm"
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
