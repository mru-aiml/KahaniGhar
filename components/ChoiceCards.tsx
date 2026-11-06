"use client";

import { useCallback, useRef, useState } from "react";
import { apiStoryService } from "@/lib/services/api-story-service";
import type { StoryScene } from "@/types/story";

interface ChoiceCardsProps {
  choices: string[];
  storyId: string;
  storySoFar: StoryScene[];
  language: string;
  childNickname: string;
  ageBand: string;
  interests: string[];
  onSelect: (choice: string, newScenes: Array<{ idx: number; text: string; choices?: string[] }>) => void;
}

export default function ChoiceCards({
  choices,
  storyId,
  storySoFar,
  language,
  childNickname,
  ageBand,
  interests,
  onSelect,
}: ChoiceCardsProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isBranching, setIsBranching] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const setButtonRef = useCallback((index: number) => (el: HTMLButtonElement | null) => {
    buttonRefs.current[index] = el;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = (index + 1) % choices.length;
          buttonRefs.current[nextIndex]?.focus();
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex = (index - 1 + choices.length) % choices.length;
          buttonRefs.current[prevIndex]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          buttonRefs.current[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          const lastIndex = choices.length - 1;
          buttonRefs.current[lastIndex]?.focus();
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          handleChoice(choices[index]);
          break;
        }
      }
    },
    [choices]
  );

  const handleChoice = async (choice: string) => {
    setIsBranching(true);
    setBranchError(null);
    
    try {
      const newScenes = await apiStoryService.branch(
        storyId,
        choice,
        storySoFar,
        language,
        childNickname,
        ageBand,
        interests
      );
      onSelect(choice, newScenes);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to continue story";
      setBranchError(message);
      console.error("Branch error:", err);
    } finally {
      setIsBranching(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = (index + 1) % choices.length;
          buttonRefs.current[nextIndex]?.focus();
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex = (index - 1 + choices.length) % choices.length;
          buttonRefs.current[prevIndex]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          buttonRefs.current[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          const lastIndex = choices.length - 1;
          buttonRefs.current[lastIndex]?.focus();
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          handleChoice(choices[index]);
          break;
        }
      }
    },
    [choices]
  );

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Story choices">
      {choices.map((c, index) => (
        <button
          key={c}
          ref={setButtonRef(index)}
          onClick={() => handleChoice(c)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={isBranching}
          role="radio"
          aria-checked={false}
          aria-disabled={isBranching}
          className="rounded-2xl border border-kg-teal/40 bg-kg-teal/10 p-4 text-left text-kg-cream transition hover:border-kg-amber hover:bg-kg-amber/10 focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-medium">{c}</span>
          {isBranching && (
            <svg className="ml-2 animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </button>
      ))}
      {branchError && (
        <div className="col-span-full p-3 rounded-lg bg-kg-danger/20 border border-kg-danger/30 text-sm text-kg-danger" role="alert">
          {branchError}
        </div>
      )}
    </div>
  );
}