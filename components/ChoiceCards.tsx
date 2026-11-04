"use client";

export default function ChoiceCards({
  choices,
  onSelect,
}: {
  choices: string[];
  onSelect: (choice: string) => void;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {choices.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="rounded-2xl border border-kg-teal/40 bg-kg-teal/10 p-4 text-left text-kg-cream transition hover:border-kg-amber hover:bg-kg-amber/10"
        >
          <span className="text-sm font-medium">{c}</span>
        </button>
      ))}
    </div>
  );
}