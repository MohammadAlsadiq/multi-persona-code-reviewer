/**
 * FixSuggestionModal — full-screen overlay showing before/after code and the
 * unified patch. Fetches /api/apply-fix if no preview is pre-loaded.
 */
import React, { useEffect, useState, useCallback } from "react";
import type { Finding } from "./FindingCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FixPreview {
  original_code: string;
  patched_code: string;
  unified_patch: string;
  status: "ok" | "patch_unavailable" | "parse_error";
}

interface FixSuggestionModalProps {
  finding: Finding | null;
  diffText: string;
  onClose: () => void;
}

function ColoredPatch({ patch }: { patch: string }) {
  return (
    <pre className="diff-block text-xs leading-5 overflow-x-auto">
      {patch.split("\n").map((line, i) => {
        let cls = "text-gray-300";
        if (line.startsWith("+") && !line.startsWith("+++")) cls = "diff-line-add";
        else if (line.startsWith("-") && !line.startsWith("---")) cls = "diff-line-remove";
        else if (line.startsWith("@@")) cls = "diff-line-meta";
        return (
          <span key={i} className={`block ${cls}`}>
            {line}
          </span>
        );
      })}
    </pre>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function FixSuggestionModal({
  finding,
  diffText,
  onClose,
}: FixSuggestionModalProps) {
  const [preview, setPreview] = useState<FixPreview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(async () => {
    if (!finding) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/apply-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, diff_text: diffText }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const data: FixPreview = await res.json();
      setPreview(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [finding, diffText]);

  useEffect(() => {
    if (finding) {
      setPreview(null);
      setFetchError(null);
      fetchPreview();
    }
  }, [finding, fetchPreview]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!finding) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-950 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-800">
          <div className="space-y-0.5">
            <h3 className="text-white text-base font-semibold">Fix Preview</h3>
            <p className="text-xs text-gray-400 font-mono">
              {finding.file}:{finding.line_number}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Issue + suggestion */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{finding.issue}</p>
            <p className="text-sm text-gray-400">{finding.suggestion}</p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Generating preview…
            </div>
          )}

          {/* Error */}
          {fetchError && !loading && (
            <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
              {fetchError}
            </div>
          )}

          {/* Preview panels */}
          {preview && !loading && (
            <>
              {preview.status === "patch_unavailable" && (
                <p className="text-xs text-amber-400">
                  No structured patch available — showing suggestion context.
                </p>
              )}

              {/* Side-by-side before/after */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Before
                    </span>
                    <CopyButton text={preview.original_code} />
                  </div>
                  <pre className="diff-block text-xs overflow-x-auto text-red-300">
                    {preview.original_code || "(empty)"}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      After
                    </span>
                    <CopyButton text={preview.patched_code} />
                  </div>
                  <pre className="diff-block text-xs overflow-x-auto text-green-300">
                    {preview.patched_code || "(empty)"}
                  </pre>
                </div>
              </div>

              {/* Unified patch */}
              {preview.unified_patch && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Unified Patch
                    </span>
                    <CopyButton text={preview.unified_patch} />
                  </div>
                  <ColoredPatch patch={preview.unified_patch} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
