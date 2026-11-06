"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChipGroup from "@/components/ChipGroup";
import LoadingLantern from "@/components/LoadingLantern";
import ErrorBoundary from "@/components/ErrorBoundary";
import AudioRecorder from "@/components/story/AudioRecorder";
import TranscriptReview from "@/components/story/TranscriptReview";
import { getStoryService } from "@/lib/services/registry";
import { LANGUAGE_LABELS, type StoryLanguage, INTEREST_OPTIONS, type AgeBand } from "@/types/story";
import type { StoryKind, CreateStoryInput } from "@/types/story";

const LANGUAGES: StoryLanguage[] = ["hi-IN", "en-IN", "hi-en", "mr-IN"];
const AGE_BANDS: AgeBand[] = ["3-5", "6-8", "9-10"];
const KINDS: StoryKind[] = ["memory", "folklore", "generated"];

function CreatePageContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("6-8");
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState<StoryLanguage>("hi-IN");
  const [kind, setKind] = useState<StoryKind>("memory");
  const [interactive, setInteractive] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);
  const [recordingMode, setRecordingMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (v: string) => {
    setInterests((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    if (isMockMode) {
      const mockTranscripts: Record<string, string> = {
        "hi-IN": "दादी ने आम के पेड़ के नीचे बैठकर कहानी सुनाई। चिंटू ने आम खाए और खुश हुआ।",
        "en-IN": "Grandma told a story under the mango tree. Chintu ate mangoes and was happy.",
        "hi-en": "Dadi ne aam ke ped ke neeche baith kar kahani sunai. Chintu ne aam khaye aur khush hua.",
        "mr-IN": "आजी आमच्या झाडाखाली बसून गोष्ट सांगितली. चिंटूने आम खाल्ले आणि आनंद झाला.",
      };
      setTranscript(mockTranscripts[language] || "A wonderful memory shared by grandma.");
      setTranscriptConfirmed(true);
      return;
    }
    setError("STT not yet configured. Please use mock mode or configure STT service.");
  };

  const handleTranscriptConfirm = (confirmedTranscript: string) => {
    setTranscript(confirmedTranscript);
    setTranscriptConfirmed(true);
  };

  const handleTranscriptRetry = () => {
    setTranscript("");
    setTranscriptConfirmed(false);
  };

  const handleTranscriptEdit = (editedTranscript: string) => {
    setTranscript(editedTranscript);
  };

  const handleGenerate = async () => {
    setError("");
    if (!nickname.trim()) { setError("Please enter a nickname."); return; }
    if (!transcriptConfirmed) { setError("Please confirm your transcript first."); return; }
    if (!transcript.trim()) { setError("Please provide a story idea."); return; }

    setLoading(true);
    try {
      const service = getStoryService();
      const input: CreateStoryInput = {
        transcript,
        language,
        child: { nickname, ageBand, interests },
        kind,
        interactive,
      };
      const story = await service.create(input);
      router.push(`/story/${story.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLantern label="Creating your story..." />;

  const isStep1Complete = nickname.trim().length > 0;
  const isStep2Complete = transcriptConfirmed && transcript.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[
            { label: "Child", num: 1 },
            { label: "Memory", num: 2 },
            { label: "Style", num: 3 },
            { label: "Generate", num: 4 },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step > i ? "bg-kg-amber text-kg-night" :
                step === i ? "bg-kg-amber text-kg-night" :
                "border-2 border-white/20 text-kg-cream/60"
              }`}>
                {step > i ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                ) : s.num}
              </div>
              <span className={`mt-1 text-xs ${step >= i ? "text-kg-amber" : "text-kg-cream/40"}`}>
                {s.label}
              </span>
              {i < 3 && (
                <div className={`w-full h-1 mx-2 ${step > i ? "bg-kg-amber" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-kg-danger/20 border border-kg-danger/30 text-sm text-kg-danger" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="mt-6 space-y-6" aria-labelledby="step1-heading">
          <h2 id="step1-heading" className="sr-only">Step 1: Child details</h2>
          <div>
            <label htmlFor="nickname" className="block text-sm text-kg-cream/80">Child&apos;s nickname</label>
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-kg-night/60 px-4 py-3 text-kg-cream outline-none focus:border-kg-amber focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              placeholder="e.g. Chintu"
              autoComplete="off"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-kg-cream/40">This name will appear in the story</p>
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Age group</label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Age group">
              {AGE_BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setAgeBand(b)}
                  role="radio"
                  aria-checked={ageBand === b}
                  className={`rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night ${ageBand === b ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
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
            <p className="mt-1 text-xs text-kg-cream/40">Select up to 10 interests</p>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!nickname.trim()}
            className="w-full rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 space-y-6" aria-labelledby="step2-heading">
          <h2 id="step2-heading" className="sr-only">Step 2: Tell the memory</h2>

          {!transcriptConfirmed && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-kg-cream/80">How would you like to share the memory?</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRecordingMode(false)}
                    className={`p-6 rounded-2xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night ${
                      !recordingMode ? "border-kg-amber bg-kg-amber/10" : "border-white/10 hover:border-kg-amber/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-teal/20">
                        <svg className="h-6 w-6 text-kg-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-kg-cream">Type the memory</h4>
                        <p className="text-sm text-kg-cream/60">Write the memory in your own words</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordingMode(true)}
                    className={`p-6 rounded-2xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night ${recordingMode ? "border-kg-amber bg-kg-amber/10" : "border-white/10 hover:border-kg-amber/50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-amber/20">
                        <svg className="h-6 w-6 text-kg-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h10m-7 4a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-kg-cream">Record the memory</h4>
                        <p className="text-sm text-kg-cream/60">Speak the memory aloud (max 30s)</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {recordingMode ? (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  maxDurationSeconds={30}
                  maxSizeBytes={5 * 1024 * 1024}
                />
              ) : (
                <div className="mt-6">
                  <label htmlFor="transcript" className="block text-sm text-kg-cream/80">Type your memory</label>
                  <textarea
                    id="transcript"
                    value={transcript}
                    onChange={(e) => { setTranscript(e.target.value); setTranscriptConfirmed(false); }}
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-kg-night/60 px-4 py-3 text-kg-cream outline-none focus:border-kg-amber focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
                    placeholder="Type the memory in your own words..."
                    maxLength={5000}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-kg-cream/40">
                      {transcript.trim().split(" ").filter(Boolean).length} words · {transcript.length} characters
                    </p>
                    <button
                      onClick={() => setTranscriptConfirmed(true)}
                      disabled={!transcript.trim()}
                      className="px-4 py-2 rounded-lg bg-kg-amber text-kg-night font-medium focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {transcriptConfirmed && (
            <TranscriptReview
              transcript={transcript}
              language={language}
              isMock={isMockMode}
              onConfirm={handleTranscriptConfirm}
              onRetry={handleTranscriptRetry}
              onEdit={handleTranscriptEdit}
            />
          )}
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 space-y-6" aria-labelledby="step3-heading">
          <h2 id="step3-heading" className="sr-only">Step 3: Story settings</h2>
          <div>
            <label className="block text-sm text-kg-cream/80">Language</label>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  role="radio"
                  aria-checked={language === l}
                  className={`rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night ${language === l ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
                >
                  {LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-kg-cream/80">Story style</label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Story style">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  role="radio"
                  aria-checked={kind === k}
                  className={`rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night ${kind === k ? "border-kg-amber bg-kg-amber text-kg-night" : "border-white/20 text-kg-cream/80"}`}
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
              className="h-4 w-4 focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
            />
            <label htmlFor="interactive" className="text-sm text-kg-cream/80">Interactive choices</label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-full border border-white/20 px-6 py-3 text-kg-cream focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night">
              Back
            </button>
            <button onClick={() => setStep(4)} className="rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night">
              Next
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="mt-6 space-y-6" aria-labelledby="step4-heading">
          <h2 id="step4-heading" className="sr-only">Step 4: Generate story</h2>
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

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMockMode}
                  onChange={(e) => setIsMockMode(e.target.checked)}
                  className="h-4 w-4 focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
                />
                <span className="text-sm text-kg-cream/80">Use mock mode (demo)</span>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-kg-danger" role="alert">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="rounded-full border border-white/20 px-6 py-3 text-kg-cream focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night">
              Back
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
            >
              Generate story
            </button>
          </div>
          <p className="text-xs text-kg-cream/40 text-center">
            {isMockMode ? "Demo mode uses a mock response. Real generation uses Gnani Evon." : "Real generation uses Gnani Evon via backend API."}
          </p>
        </section>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <ErrorBoundary>
      <CreatePageContent />
    </ErrorBoundary>
  );
}