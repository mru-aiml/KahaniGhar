"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChipGroup from "@/components/ChipGroup";
import LoadingLantern from "@/components/LoadingLantern";
import { storyService } from "@/lib/services/story-service";
import { LANGUAGE_LABELS, type StoryLanguage, INTEREST_OPTIONS, type AgeBand } from "@/types/story";
import type { StoryKind } from "@/types/story";

const LANGUAGES: StoryLanguage[] = ["hi-IN", "en-IN", "hi-en", "mr-IN"];
const AGE_BANDS: AgeBand[] = ["3-5", "6-8", "9-10"];
const KINDS: StoryKind[] = ["memory", "folklore", "generated"];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("6-8");
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState<StoryLanguage>("hi-IN");
  const [kind, setKind] = useState<StoryKind>("memory");
  const [interactive, setInteractive] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (v: string) => {
    setInterests((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleGenerate = async () => {
    setError("");
    if (!nickname.trim()) { setError("Please enter a nickname."); return; }
    if (!transcript.trim()) { setError("Please tell or type a story idea."); return; }
    setLoading(true);
    try {
      const story = await storyService.create({
        transcript,
        language,
        child: { nickname, ageBand, interests },
        kind,
        interactive,
      });
      router.push(`/story/${story.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLantern label="Creating your story..." />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl text-kg-cream">Create a story</h1>
      <p className="mt-1 text-kg-cream/60">Step {step} of 3</p>

      {step === 1 && (
        <section className="mt-6 space-y-6">
          <div>
            <label className="block text-sm text-kg-cream/80">Child&apos;s nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-kg-night/60 px-4 py-3 text-kg-cream outline-none focus:border-kg-amber"
              placeholder="e.g. Chintu"
            />
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Age group</label>
            <div className="mt-2 flex gap-2">
              {AGE_BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setAgeBand(b)}
                  className={`rounded-full border px-4 py-2 text-sm ${ageBand === b ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Interests</label>
            <div className="mt-2">
              <ChipGroup options={INTEREST_OPTIONS} selected={interests} onToggle={toggleInterest} />
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            className="rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night"
          >
            Next
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 space-y-6">
          <div>
            <label className="block text-sm text-kg-cream/80">Language</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`rounded-full border px-4 py-2 text-sm ${language === l ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
                >
                  {LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Story style</label>
            <div className="mt-2 flex gap-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-4 py-2 text-sm ${kind === k ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="interactive"
              type="checkbox"
              checked={interactive}
              onChange={(e) => setInteractive(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="interactive" className="text-sm text-kg-cream/80">Interactive choices</label>
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Tell your story idea</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-xl border border-white/20 bg-kg-night/60 px-4 py-3 text-kg-cream outline-none focus:border-kg-amber"
              placeholder="Speak or type a memory..."
            />
            <p className="mt-1 text-xs text-kg-cream/40">
              In the full app, you can record audio here (Gnani Prisma STT).
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="rounded-full border border-white/20 px-6 py-3 text-kg-cream">
              Back
            </button>
            <button onClick={() => setStep(3)} className="rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night">
              Review
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-kg-cream/5 p-5">
            <h2 className="font-heading text-xl text-kg-cream">Review</h2>
            <ul className="mt-3 space-y-1 text-sm text-kg-cream/70">
              <li>Nickname: {nickname}</li>
              <li>Age: {ageBand}</li>
              <li>Language: {LANGUAGE_LABELS[language]}</li>
              <li>Style: {kind} · {interactive ? "interactive" : "linear"}</li>
              <li>Interests: {interests.join(", ") || "—"}</li>
              <li className="line-clamp-3">Idea: {transcript}</li>
            </ul>
          </div>
          {error && <p className="text-sm text-kg-danger">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-full border border-white/20 px-6 py-3 text-kg-cream">
              Back
            </button>
            <button
              onClick={handleGenerate}
              className="rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night"
            >
              Generate story (demo)
            </button>
          </div>
          <p className="text-xs text-kg-cream/40">
            Demo mode uses a mock response. Real generation uses Gnani Evon.
          </p>
        </section>
      )}
    </div>
  );
}