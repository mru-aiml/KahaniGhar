# KahaniGhar

AI-powered, multilingual, interactive storytelling for children and families.
Built for the Great Indian AI Internship Challenge 2026 (Gnani.ai).

## Stack
Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Storage),
Gnani Prisma v2.5 (STT), Gnani Timbre v2.5 (TTS), Gnani Evon v3.3 (LLM, self-hosted).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and fill values:
   ```bash
   cp .env.example .env.local
   ```
3. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
   Create private buckets `recordings` and `tts-cache`.
4. (Optional for Phase 0) Generate a Gnani API key at https://app.gnani.ai/voice.
5. Run dev server:
   ```bash
   npm run dev
   ```

## Phase 0 verification (real Gnani calls)

```bash
GNANI_API_KEY=xxx AUDIO_PATH=/path/to/clip.wav node scripts/test-gnani.mjs
```
Consumes credits. Verify `tts-test.wav` plays and the transcript looks right.

## Docs
See `docs/` (prd, architecture, design, phase, rules).

## Security notes
- All Gnani/LLM/Supabase-service calls are server-side only.
- Never commit `.env*`, recordings, or personal data.