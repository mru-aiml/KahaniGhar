"use client";

export default function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-kg-amber bg-kg-amber text-kg-night"
                : "border-white/20 bg-white/5 text-kg-cream/80 hover:border-kg-amber/50"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}