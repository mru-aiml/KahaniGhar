"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AudioPlayer from "@/components/AudioPlayer";
import ChoiceCards from "@/components/ChoiceCards";
import LoadingLantern from "@/components/LoadingLantern";
import { storyService } from "@/lib/services/story-service";
import { LANGUAGE_LABELS } from "@/types/story";
import type { Story } from "@/types/story";

export default function StoryReader() {
  const params = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [branchCount, setBranchCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    storyService.get(params.id).then((s) => {
      if (active) {
        setStory(s);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <LoadingLantern label="Opening the storybook..." />;
  if (!story) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-kg-cream/70">Story not found.</p>
        <Link href="/library" className="mt-4 inline-block text-kg-teal">Back to storybook</Link>
      </div>
    );
  }

  const scenes = story.structure.scenes;
  const scene = scenes[sceneIdx];
  const isLast = sceneIdx === scenes.length - 1;
  const hasChoices = !!scene.choices?.length && branchCount < 3 && !isLast;

  const handleChoice = (choice: string) => {
    // Mock branching: advance to next scene; real version calls /api/story/branch.
    setBranchCount((c) => c + 1);
    if (sceneIdx < scenes.length - 1) setSceneIdx(sceneIdx + 1);
    else setFinished(true);
    console.debug("choice selected (demo):", choice);
  };

  const next = () => {
    if (sceneIdx < scenes.length - 1) setSceneIdx(sceneIdx + 1);
    else setFinished(true);
  };
  const prev = () => {
    if (sceneIdx > 0) setSceneIdx(sceneIdx - 1);
  };

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 font-heading text-3xl text-kg-amber">The End</h1>
        <p className="mt-2 text-kg-cream/70">{story.structure.moral}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => { setSceneIdx(0); setFinished(false); setBranchCount(0); }}
            className="rounded-full border border-white/20 px-5 py-2 text-kg-cream"
          >
            Read again
          </button>
          <Link href="/library" className="rounded-full bg-kg-amber px-5 py-2 text-kg-night">
            Back to storybook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/library" className="text-sm text-kg-teal hover:text-kg-amber">← Storybook</Link>
        <span className="rounded-full bg-kg-amber/20 px-3 py-1 text-xs text-kg-amber">
          {LANGUAGE_LABELS[story.language]}
        </span>
      </div>
      <h1 className="font-heading text-2xl text-kg-cream">{story.title}</h1>
      <p className="mt-1 text-sm text-kg-cream/50">
        Narrated by {story.narrator} · for {story.childNickname}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-kg-cream/5 p-6">
        <p className="text-lg leading-relaxed text-kg-cream">{scene.text}</p>
      </div>

      <div className="mt-4">
        <AudioPlayer sceneCount={scenes.length} currentScene={sceneIdx} onSceneChange={setSceneIdx} />
      </div>

      {hasChoices && (
        <div className="mt-6">
          <p className="text-sm text-kg-cream/60">What happens next?</p>
          <ChoiceCards choices={scene.choices!} onSelect={handleChoice} />
        </div>
      )}

      {!hasChoices && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={prev}
            disabled={sceneIdx === 0}
            className="rounded-full border border-white/20 px-5 py-2 text-kg-cream disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            onClick={next}
            className="rounded-full bg-kg-amber px-5 py-2 text-kg-night"
          >
            {isLast ? "Finish" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}