# Phase Plan: 6-day sprint

Today is **Wed 4 Nov 2026 (night)**. Deadline: **Tue 10 Nov, 11:59 PM IST, no extensions**.
Internal target: **submit on Tue 10 Nov by 6 PM**.

Rule of the sprint: at the end of every day there must be a build that can be demoed. If a task slips, cut by the order in section 8, not by working all night.

---

## Phase 0: Setup and unblock (tonight, Wed 4 Nov)

- [ ] Register on the official challenge page (name, email, phone, college, solo/team). Decide who is the primary registrant (credits go to that person).
- [ ] Join the Gnani Discord.
- [ ] Generate API key at app.gnani.ai/voice; confirm 5,000 credits.
- [ ] Request Evon v3.3 weights on Hugging Face.
- [ ] Post 3 questions on Discord: (1) how to run/test Evon quickly, (2) is voice cloning allowed and covered by credits, (3) is an LLM other than Evon acceptable for story text if Evon hosting fails.
- [ ] Run 3 curl tests: STT (Hindi clip), TTS REST, TTS with a v2.5 voice. Note model names that actually work.
- [ ] Create repo, Next.js app, Supabase project, `.env.local` (not committed).
- [ ] Read the programme terms on project ownership.

Exit: one TTS audio file and one STT transcript produced from your own machine.

## Phase 1: Core loop (Thu 5 Nov)

Goal: type or paste text -> story -> narrated audio.

- [ ] `lib/gnani/tts.ts` and `/api/tts` with caching in Storage.
- [ ] `lib/llm/client.ts` pointing to Evon endpoint (or Plan B after Discord reply).
- [ ] Story JSON schema (Zod) + `generateStory()` prompt (JSON only, age-safe).
- [ ] F3 Personalization: child nickname, age band, interests -> story.
- [ ] Basic Player: scene text + play/pause, prefetch next scene.
- [ ] Deploy to Vercel (early, so deployment problems show up now).

Exit: "Tell me a story about <name> who loves <interest>" plays aloud in Hindi and English.

## Phase 2: Speak a memory (Fri 6 Nov)

Goal: F1 Story Creator + F2 multilingual / code-mixed.

- [ ] Recorder component (MediaRecorder) -> `/api/stt` (REST first).
- [ ] Editable transcript screen with language chip.
- [ ] "Memory" mode prompt: keep original names/places/facts, structure into scenes, add gentle moral.
- [ ] Language switcher; test Hindi, English, Hinglish + one more regional language.
- [ ] Save recordings and stories to Supabase.
- [ ] Test STT on a noisy-room clip and write down the result honestly.

Exit: speak a Hinglish memory -> transcript -> story -> narration.

## Phase 3: Interactive + library (Sat 7 Nov)

Goal: F4, then F7 and F6.

- [ ] Choice moments in scenes; ChoiceCards UI; tap selection.
- [ ] Voice selection of choice (STT on a short clip).
- [ ] `/api/story/branch`; limit 3 branches; forced happy ending.
- [ ] Family Library list, search, delete.
- [ ] Grandma's Storybook page (original recording + finished story).

Exit: full interactive story saved and re-openable from the library.

## Phase 4: Familiar Voice (Sun 8 Nov)

Goal: F5 with consent, only if Discord confirms voice cloning is allowed.

- [ ] ConsentModal + stored consent text/time.
- [ ] Recorder for 5-30 s sample; `/api/voice/enroll`.
- [ ] VoicePicker with "AI voice, authorized by X" label.
- [ ] Delete voice (removes embedding).
- [ ] Use only teammates' own voices for testing.
- Fallback: if cloning is not allowed or fails, ship 4 preset narrator voices ("Dadi", "Nani", "Papa", "Didi" as labels over Timbre voices, clearly marked as AI presets).

Exit: story plays in a consenting teammate's cloned voice.

## Phase 5: Polish, test, record (Mon 9 Nov)

- [ ] Apply design.md: colors, fonts, empty/error states, loading lantern.
- [ ] Test with 5-10 people; log misunderstandings (for the honest numbers).
- [ ] Fix top 5 bugs only. No new features.
- [ ] Record 60-second demo (script in design.md section 9). Record 3 takes.
- [ ] Write the explanation: problem, users, what it does, models used (Prisma v2.5, Timbre v2.5, Evon v3.3, plus voice-clone if used), who did what, limitations, next steps.
- [ ] Publish demo on LinkedIn or X with **#GreatIndianAIInternshipChallenge** and **#GnaniAI**; nominate the posts on the form.
- [ ] Repo: README, setup steps, `.env.example`, no secrets.

Exit: demo video + written explanation + public post ready.

## Phase 6: Submit (Tue 10 Nov)

- [ ] Morning: re-test the deployed app from a phone on mobile data.
- [ ] Final bug fixes only (until noon).
- [ ] Submit by **6 PM**: demo link/video, written explanation, models list, post links.
- [ ] Verify the submission confirmation. Screenshot it.
- [ ] 6 PM to 11:59 PM is buffer only.

---

## 7. Daily checkpoint (5 minutes each night)

1. What can I demo right now?
2. What blocks tomorrow?
3. Is the credit balance enough? (cache audio, avoid regenerating)

## 8. Cut order if behind schedule

1. Drop F7 (library search/filter polish)
2. Drop F6 (Storybook page; keep library list)
3. Drop F5 (cloning); use preset narrator voices
4. Drop realtime STT (keep REST)
5. Drop extra languages beyond Hindi, English, Hinglish + 1

Never drop: Story Creator, Narration, Personalization, Interactive choices, honest model list, demo video, public post.
