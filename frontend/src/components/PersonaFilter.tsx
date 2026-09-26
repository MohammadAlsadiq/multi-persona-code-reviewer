/**
 * PersonaFilter — chip-style toggle buttons to show/hide findings by category.
 */
import React from "react";

export type Persona = "SECURITY" | "PERFORMANCE" | "ARCHITECTURE";

interface PersonaFilterProps {
  active: Set<Persona>;
  counts: Record<Persona, number>;
  onChange: (persona: Persona) => void;
}

const PERSONA_META: Record<Persona, { label: string; color: string; active: string }> = {
  SECURITY: {
    label: "Security",
    color: "border-red-300 text-red-700 bg-red-50",
    active: "bg-red-600 text-white border-red-600",
  },
  PERFORMANCE: {
    label: "Performance",
    color: "border-amber-300 text-amber-700 bg-amber-50",
    active: "bg-amber-500 text-white border-amber-500",
  },
  ARCHITECTURE: {
    label: "Architecture",
    color: "border-purple-300 text-purple-700 bg-purple-50",
    active: "bg-purple-600 text-white border-purple-600",
  },
};

export default function PersonaFilter({ active, counts, onChange }: PersonaFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-gray-500 font-medium">Filter:</span>
      {(Object.keys(PERSONA_META) as Persona[]).map((p) => {
        const meta = PERSONA_META[p];
        const isActive = active.has(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`
              flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border font-medium transition
              ${isActive ? meta.active : meta.color}
            `}
          >
            {meta.label}
            <span
              className={`
                inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-xs font-bold
                ${isActive ? "bg-white/20" : "bg-gray-200 text-gray-600"}
              `}
            >
              {counts[p]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
