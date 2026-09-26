/**
 * PersonaFilter — chip-style toggle buttons. Theme-aware via dark: variants.
 */
import React from "react";

export type Persona = "SECURITY" | "PERFORMANCE" | "ARCHITECTURE";

interface PersonaFilterProps {
  active: Set<Persona>;
  counts: Record<Persona, number>;
  onChange: (persona: Persona) => void;
}

const PERSONA_META: Record<Persona, { label: string; idle: string; on: string }> = {
  SECURITY: {
    label: "Security",
    idle: "border-red-300   text-red-700   bg-red-50   dark:border-red-800  dark:text-red-400  dark:bg-red-900/30",
    on:   "bg-red-600   text-white border-red-600   dark:bg-red-700  dark:border-red-700",
  },
  PERFORMANCE: {
    label: "Performance",
    idle: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-900/30",
    on:   "bg-amber-500 text-white border-amber-500 dark:bg-amber-600 dark:border-amber-600",
  },
  ARCHITECTURE: {
    label: "Architecture",
    idle: "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:bg-purple-900/30",
    on:   "bg-purple-600 text-white border-purple-600 dark:bg-purple-700 dark:border-purple-700",
  },
};

export default function PersonaFilter({ active, counts, onChange }: PersonaFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted font-medium">Filter:</span>
      {(Object.keys(PERSONA_META) as Persona[]).map((p) => {
        const meta = PERSONA_META[p];
        const isOn = active.has(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border font-medium transition ${isOn ? meta.on : meta.idle}`}
          >
            {meta.label}
            <span
              className={`inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-xs font-bold ${
                isOn ? "bg-white/25" : "bg-black/10 dark:bg-white/10 text-secondary"
              }`}
            >
              {counts[p]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
