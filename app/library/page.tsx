"use client";

import { useEffect, useState } from "react";
import StoryCard from "@/components/StoryCard";
import EmptyState from "@/components/EmptyState";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { storyService } from "@/lib/services/story-service";
import type { Story, StoryFilters } from "@/types/story";
import { LANGUAGE_LABELS } from "@/types/story";

export default function LibraryPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StoryFilters>({ query: "", language: "all", kind: "all", narrator: "all" });
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await storyService.search(filters);
    setStories(res);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await storyService.remove(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const narrators = Array.from(new Set(stories.map((s) => s.narrator)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl text-kg-cream">My Storybook</h1>
      <p className="mt-1 text-kg-cream/60">Your family&apos;s saved stories.</p>

      {/* Search + filters */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Search by title, narrator..."
          className="w-full rounded-xl border border-white/20 bg-kg-night/60 px-4 py-2 text-kg-cream outline-none focus:border-kg-amber md:max-w-sm"
        />
        <select
          value={filters.language}
          onChange={(e) => setFilters({ ...filters, language: e.target.value as StoryFilters["language"] })}
          className="rounded-xl border border-white/20 bg-kg-night/60 px-3 py-2 text-kg-cream"
        >
          <option value="all">All languages</option>
          {Object.entries(LANGUAGE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.kind}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value as StoryFilters["kind"] })}
          className="rounded-xl border border-white/20 bg-kg-night/60 px-3 py-2 text-kg-cream"
        >
          <option value="all">All types</option>
          <option value="memory">Memory</option>
          <option value="folklore">Folklore</option>
          <option value="generated">Generated</option>
        </select>
        <select
          value={filters.narrator}
          onChange={(e) => setFilters({ ...filters, narrator: e.target.value })}
          className="rounded-xl border border-white/20 bg-kg-night/60 px-3 py-2 text-kg-cream"
        >
          <option value="all">All narrators</option>
          {narrators.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-kg-cream/60">Loading...</p>
        ) : stories.length === 0 ? (
          <EmptyState title="No stories found" description="Try a different search or create a new story." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} onDelete={(id) => {
                const t = stories.find((x) => x.id === id);
                if (t) setDeleteTarget(t);
              }} />
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?.title ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}