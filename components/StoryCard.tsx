"use client";

import Link from "next/link";
import type { Story } from "@/types/story";
import { LANGUAGE_LABELS } from "@/types/story";

export default function StoryCard({
  story,
  onDelete,
}: {
  story: Story;
  onDelete?: (id: string) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-kg-cream/5 p-5 transition hover:border-kg-amber/40 hover:bg-kg-cream/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg text-kg-cream">{story.title}</h3>
          <p className="mt-1 text-sm text-kg-cream/60">
            {story.narrator} · {story.childNickname} · {story.ageBand} yrs
          </p>
        </div>
        <span className="rounded-full bg-kg-amber/20 px-2 py-1 text-xs text-kg-amber">
          {LANGUAGE_LABELS[story.language]}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-kg-cream/70">
        {story.structure.scenes[0]?.text}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/story/${story.id}`}
          className="text-sm font-medium text-kg-teal hover:text-kg-amber"
        >
          Continue reading →
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(story.id)}
            className="text-xs text-kg-cream/40 hover:text-kg-danger"
            aria-label="Delete story"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}