export default function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-kg-cream/5 p-10 text-center">
      <div className="text-4xl">📖</div>
      <h3 className="mt-3 font-heading text-xl text-kg-cream">{title}</h3>
      <p className="mt-1 text-sm text-kg-cream/60">{description}</p>
    </div>
  );
}