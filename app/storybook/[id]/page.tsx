"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { storyService } from "@/lib/services/story-service";
import { LANGUAGE_LABELS } from "@/types/story";
import type { Story } from "@/types/story";

function StorybookContent() {
  const params = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    storyService
      .get(params.id)
      .then((s) => {
        if (active) {
          setStory(s);
          setLoading(false);
          if (!s) setError("Story not found");
        }
      })
      .catch(() => {
        if (active) {
          setError("Failed to load story");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <div className="py-16 text-center text-kg-cream/60">Opening the book...</div>;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-5xl" role="img" aria-label="Error">😔</div>
        <h1 className="mt-4 font-heading text-2xl text-kg-cream">Couldn&apos;t load story</h1>
        <p className="mt-2 text-kg-cream/70">{error}</p>
        <Link href="/library" className="mt-4 inline-block text-kg-teal hover:text-kg-amber">
          Back to storybook
        </Link>
      </div>
    );
  }
  if (!story) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-5xl" role="img" aria-label="Error">😔</div>
        <h1 className="mt-4 font-heading text-2xl text-kg-cream">Story not found</h1>
        <Link href="/library" className="mt-4 inline-block text-kg-teal hover:text-kg-amber">
          Back to storybook
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/library" className="text-sm text-kg-teal hover:text-kg-amber">← Back to storybook</Link>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Original memory side */}
        <div className="rounded-2xl border border-white/10 bg-kg-cream/5 p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-kg-teal/20 px-2 py-1 text-xs text-kg-teal">Original memory</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-kg-cream/60">{LANGUAGE_LABELS[story.language]}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-kg-cream/60">{story.kind}</span>
          </div>
          <p className="text-sm italic text-kg-cream/70">
            &ldquo;{story.structure.scenes[0]?.text}&rdquo;
          </p>
          <p className="mt-4 text-xs text-kg-cream/40">
            Original recording would play here (Gnani Prisma transcript).
          </p>
        </div>
        {/* Finished story side */}
        <div className="rounded-2xl border border-kg-amber/30 bg-kg-cream/10 p-6">
          <h2 className="font-heading text-xl text-kg-amber">{story.title}</h2>
          <p className="mt-2 text-sm text-kg-cream/60">
            Narrator: {story.narrator} &middot; {story.childNickname} &middot; {story.ageBand}
          </p>
          <div className="mt-4 space-y-3">
            {story.structure.scenes.map((s) => (
              <p key={s.idx} className="text-sm leading-relaxed text-kg-cream/80">{s.text}</p>
            ))}
          </div>
          <p className="mt-4 text-xs italic text-kg-amber/80">Moral: {story.structure.moral}</p>
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link href={`/story/${story.id}`} className="rounded-full bg-kg-amber px-6 py-3 text-kg-night">
          Read interactively →
        </Link>
      </div>
    </div>
  );
}

export default function StorybookPage() {
  return (
    <ErrorBoundary>
      <StorybookContent />
    </ErrorBoundary>
  );
}