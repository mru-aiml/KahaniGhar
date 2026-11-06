"use client";

import { useCallback, useEffect, useState } from "react";
import StoryCard from "@/components/StoryCard";
import EmptyState from "@/components/EmptyState";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingLantern from "@/components/LoadingLantern";
import { getStoryService } from "@/lib/services/registry";
import type { Story, StoryFilters } from "@/types/story";
import { LANGUAGE_LABELS } from "@/types/story";

function LibraryContent() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StoryFilters>({ query: "", language: "all", kind: "all", narrator: "all" });
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const service = getStoryService();
      const res = await service.search(filters);
      setStories(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load stories";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const service = getStoryService();
      await service.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete story";
      setError(message);
    }
  };

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
          {Array.from(new Set(stories.map((s) => s.narrator))).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        {loading ? (
          <LoadingLantern label="Loading your storybook..." />
        ) : error ? (
          <div className="rounded-2xl border border-kg-danger/30 bg-kg-danger/10 p-6 text-center">
            <div className="text-3xl" role="img" aria-label="Error">😔</div>
            <h3 className="mt-2 font-heading text-lg text-kg-cream">Couldn&apos;t load stories</h3>
            <p className="mt-1 text-sm text-kg-cream/70">{error}</p>
            <button
              onClick={load}
              className="mt-3 rounded-full bg-kg-amber px-4 py-2 text-sm text-kg-night"
            >
              Try again
            </button>
          </div>
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

export default function LibraryPage() {
  return (
    <ErrorBoundary>
      <LibraryContent />
    </ErrorBoundary>
  );
}