# Architecture: KahaniGhar

Design goal: the simplest stack that a vibe-coding tool can build in 6 days, with the Gnani API key kept on the server.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Fast to vibe-code, easy to deploy |
| Backend | Next.js Route Handlers (server-side only) | One repo, hides API keys |
| Database | Supabase Postgres | Free tier, simple SQL |
| File storage | Supabase Storage | Recordings, cached TTS audio |
| STT | Gnani Prisma v2.5 (api.vachana.ai) | Indic + code-mixed speech |
| TTS | Gnani Timbre v2.5 (and v2.0 voices) | Indian-language narration |
| Voice cloning | Gnani voice-clone API (embeddings) | Familiar Voice feature, P1 |
| LLM | Gnani Evon v3.3 (open weights) | Story structuring, personalization, branching |
| Hosting | Vercel (app) + a GPU host for Evon | See section 8 |

Avoid the Prisma ORM so it is never confused with Gnani's Prisma STT model. Use `@supabase/supabase-js` or Drizzle.

## 2. System diagram

```
 Browser (mic, player, library)
    |  HTTPS
    v
 Next.js server (Route Handlers)  -- holds GNANI_API_KEY, LLM_URL
    |-- /api/stt ------------> Gnani STT  (POST /stt/v3  or WS /stt/v3/stream)
    |-- /api/story/generate -> Evon v3.3 endpoint (OpenAI-compatible, vLLM or similar)
    |-- /api/story/branch ---> Evon v3.3
    |-- /api/tts ------------> Gnani TTS  (POST /api/v1/tts/inference, /sse, or WS)
    |-- /api/voice/enroll ---> Gnani voice-clone embeddings
    |-- /api/library/* ------> Supabase (Postgres + Storage)
```

The browser never sees the Gnani key. All Gnani calls go through the server.

## 3. Gnani integration notes (verified from public docs, re-check before coding)

- Auth: single header `X-API-Key-ID: <API_KEY>`. No org or user id needed.
- Base URL: `https://api.vachana.ai`.
- STT REST: `POST /stt/v3`, multipart upload with audio file and a language code such as `hi-IN`.
- STT realtime: `wss://api.vachana.ai/stt/v3/stream`. Send raw PCM, signed 16-bit little-endian, mono, 16 kHz (or 8 kHz), 1,024-byte frames (512 samples).
- TTS REST: `POST /api/v1/tts/inference` returns the full audio.
- TTS SSE: `POST /api/v1/tts/sse` streams chunks.
- TTS realtime: `wss://api.vachana.ai/api/v1/tts`, send JSON `{text, voice, model}`.
- TTS models: `timbre-v2.0` (4 voices: Pranav, Kaveri, Shubhra, Deepak) and `timbre-v2.5` (42 voices, optional `language` like `hi-IN`). The older name `vachana-voice-v3` was renamed to `timbre-v2.0`; some quick-start examples still show older names, so confirm in the dashboard.
- Output options include sample rates 8000/16000/22050/44100/48000, and containers wav/mp3/ogg/raw.
- Voice clone: `POST /api/v1/tts/voice-clone/embeddings` with `audio_file` (WAV/MP3, ideally 5-30 s of clear speech) returns a `speaker_embedding`. Then call TTS with the cloned-voice model (docs show `vachana-vc-v1`) and pass `speaker_embedding`.
- Keep every model name and voice id in env/config, not in code.

## 4. Data model (Postgres)

```
families        id, name, created_at
members         id, family_id, display_name, role (grandparent|parent|child|other)
children        id, family_id, nickname, age_band (3-5|6-8|9-10), interests text[]   -- synthetic/nickname only
voices          id, member_id, label, speaker_embedding (text), consent_at, consent_text, deleted_at
recordings      id, member_id, storage_path, language, duration_s, transcript, created_at
stories         id, family_id, title, language, kind (memory|folklore|generated), source_recording_id,
                narrator_member_id, child_id, age_band, structure jsonb, created_at
scenes          id, story_id, idx, text, choice_prompt, choices jsonb, audio_path, voice_id, model
```

`structure` JSON: `{ title, characters[], moral, scenes:[{idx,text,choices?}] }`

Rules: `speaker_embedding` is never returned to the client; deleting a voice nulls the embedding and sets `deleted_at`.

## 5. Key flows

**F1 Story Creator**
1. Browser records audio (MediaRecorder) -> `POST /api/stt` (REST for short clips; realtime WS is a stretch).
2. Server calls Gnani STT -> returns transcript. User edits transcript.
3. `POST /api/story/generate` with transcript, language, child profile -> Evon returns the structure JSON (JSON-only prompt, validated with Zod; retry once on invalid JSON).
4. Story saved to `stories` + `scenes`.

**F2 Narration**
1. Player requests `/api/tts` per scene with `{sceneId, voiceId}`.
2. Server checks `scenes.audio_path` cache; if missing, calls Gnani TTS, stores the file, returns a URL.
3. Prefetch scene N+1 while scene N plays.

**F3 Personalization**: child nickname, age band, and interests go into the Evon system prompt; an output check rejects stories containing banned themes.

**F4 Interactive**: at a scene with `choices`, the player pauses. A tap or a spoken answer (STT) selects one; `POST /api/story/branch` sends story-so-far + choice and gets the next scenes. Hard limit: 3 branch points, forced happy ending.

**F5 Familiar Voice**: consent screen -> record 5-30s -> `/api/voice/enroll` -> store embedding + consent record -> voice appears in the voice picker with an "AI voice, authorized by X" label.

**F6/F7 Storybook and Library**: read-only views over `stories`, `recordings`, `members`, with search and delete.

## 6. API routes

| Route | Method | Purpose |
|---|---|---|
| /api/stt | POST | Audio -> transcript |
| /api/story/generate | POST | Transcript + profile -> story JSON |
| /api/story/branch | POST | Story so far + choice -> next scenes |
| /api/tts | POST | Scene text + voice -> audio URL (cached) |
| /api/voice/enroll | POST | Sample + consent -> voice record |
| /api/voice/:id | DELETE | Remove voice + embedding |
| /api/library | GET | List stories/recordings |
| /api/library/:id | GET/DELETE | Open or remove |

## 7. Safety, privacy, reliability

- Secrets only in server env: `GNANI_API_KEY`, `LLM_URL`, `LLM_KEY`, Supabase keys.
- Rate limit per IP on all Gnani-calling routes (credits are limited: 5,000).
- Content safety: system prompt for age-appropriate stories + simple banned-word/theme check on output.
- Voice cloning only after stored consent; no cloning of public figures; deletion works.
- Synthetic/consenting data only (contest rule). No real phone numbers, IDs, or third-party recordings.
- Graceful degradation: if TTS fails, show text with a retry button; if STT fails, allow typing.
- Log request ids and Gnani error codes, never log audio or transcripts of real people.

## 8. The Evon question (biggest technical risk)

Evon v3.3 is described on the challenge page as an open-weight 30B-parameter model (about 3.5B active per token), 128K context, 11 Indian languages, Apache 2.0, and not yet on the API platform; weights are requested through Hugging Face.

Plan:
1. **Day 0**: request the weights; ask on Discord for the recommended way to run/test it and whether a hosted endpoint exists.
2. **Plan A**: serve with vLLM (or similar) on a rented GPU, exposing an OpenAI-compatible `/v1/chat/completions`; the app only reads `LLM_URL`. A quantized build is likely needed for a single GPU.
3. **Plan B** (if weights/GPU are not workable by end of Day 1): ask organisers on Discord whether another LLM for the story text is acceptable while still using Gnani Prisma and Timbre. Do not silently swap models; the submission must name every model honestly.
4. Keep the LLM behind one function `generateStory()` so swapping is a one-file change.

## 9. Folder structure

```
/app            pages: / (home), /create, /story/[id], /library, /voices
/app/api        route handlers listed above
/lib/gnani      stt.ts, tts.ts, voice.ts  (thin clients, config from env)
/lib/llm        client.ts, prompts.ts, schema.ts (Zod)
/lib/db         queries.ts
/components     Player, Recorder, ChoiceCards, StoryBook, VoicePicker, ConsentModal
/docs           prd.md, architecture.md, design.md, phase.md, rules.md
```
