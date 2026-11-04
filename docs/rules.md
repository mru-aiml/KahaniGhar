# Rules: KahaniGhar

Three parts: A) contest rules, B) privacy and safety rules, C) rules for the AI coding tool (paste this file into the tool as project instructions).

---

## A. Contest rules (Great Indian AI Internship Challenge 2026)

Source: the public challenge page and summaries; re-read the official page at gnani.ai/internship and the programme terms on the registration page before submitting.

1. Eligibility: enrolled at a college/university in India, 18 or older on registration day. Solo or team of exactly two.
2. Deadline: **10 Nov 2026, 11:59 PM IST. No extensions.**
3. Every entry must use Gnani models/APIs, and each one must be **named in the submission**: Prisma v2.5 (STT), Timbre v2.5 (TTS, beta), Evon v3.3 (open-weight reasoning model, request weights via Hugging Face).
4. Submission needs: working demo or video, written explanation, list of models/APIs used, links to public posts.
5. Post the demo publicly on LinkedIn or X with both hashtags: **#GreatIndianAIInternshipChallenge** and **#GnaniAI**, then nominate the posts.
6. **Synthetic data only.** No real phone numbers, account numbers, Aadhaar, PAN, or recorded calls. Record only yourself or a consenting teammate.
7. **No bought engagement.** No purchased likes, bots, paid promotion, or like-for-like groups.
8. **No faked demos.** Show real behavior. State limitations honestly (for example, "misheard 3 of 20 phrases in noise").
9. Teams: each person is interviewed and judged separately; stipends are never split. API credits (5,000) go to the primary registrant.
10. One person/team can win at most one award. Awards are judged separately from the internship shortlist.
11. Read the project ownership terms before submitting.

## B. Privacy, consent and child-safety rules

1. Voice is personal data (India's DPDP Act). Treat every recording and embedding as sensitive.
2. Voice cloning only after an explicit consent step; store consent text and time.
3. Never clone a voice of a public figure or anyone who has not consented.
4. Voices are usable only inside the family that added them. Deletion must remove the embedding.
5. Always label cloned narration as "AI voice, authorized by <name>".
6. Children are represented only by a nickname and age band. No real child data in the demo.
7. Story content: age-appropriate, no violence, no frightening endings for under-6, no adult themes, no real brands or real people in generated stories.
8. No open chat with a child; the child can only pick choices or speak a choice.
9. No ads, trackers, or external links in the player.

## C. Rules for the AI coding tool (vibe-coding instructions)

### C1. Project context
- Product: KahaniGhar, an AI storyteller. Read `prd.md`, `architecture.md`, `design.md`, `phase.md` before writing code.
- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase. Do not add other frameworks. Do not use the Prisma ORM (name clash with Gnani Prisma STT).

### C2. Scope discipline
- Build only the current phase from `phase.md`. Do not start the next phase.
- P0 features first: Story Creator, Multilingual Narration, Personalization, Interactive Stories.
- If something is not in the PRD, ask before building it.

### C3. Secrets and config
- Never put `GNANI_API_KEY`, `LLM_KEY`, or Supabase service keys in client code or in the repo.
- All Gnani and LLM calls happen in server route handlers.
- Model names, voice ids, language codes, and base URLs come from `lib/config.ts` reading env vars. No hardcoded model strings elsewhere.
- Provide `.env.example` with placeholder values.

### C4. Gnani API handling
- Send the key in the `X-API-Key-ID` header.
- Keep thin clients in `lib/gnani/` (`stt.ts`, `tts.ts`, `voice.ts`).
- Cache every generated audio file per scene + voice + language; never regenerate on replay (credits are limited).
- Handle timeouts and non-200 responses with a clear error shape `{ code, message, retryable }`.
- Do not invent API fields. If a parameter is unclear, check docs.gnani.ai or leave a `TODO(verify)` comment.

### C5. LLM output
- Story generation must return JSON matching the Zod schema in `lib/llm/schema.ts`. Validate; retry once; then show a friendly error.
- Prompts live in `lib/llm/prompts.ts`, not scattered in routes.
- Every prompt includes: language, age band, child nickname and interests, safety rules from section B7, and the instruction to keep factual details from a spoken memory unchanged.

### C6. Code quality
- TypeScript strict mode, no `any` unless commented.
- Small components, one responsibility each; reuse the components listed in `design.md`.
- Every route validates input (Zod) and never trusts the client.
- Add basic rate limiting to routes that call Gnani.
- No dead code, no commented-out blocks, no console logs of audio or transcripts.

### C7. UI rules
- Follow `design.md` colors, fonts, and states. Mobile-first.
- Every async action has loading, error, and empty states.
- Hindi and English UI strings in one `i18n` file.

### C8. Testing and definition of done
A task is done only when:
1. It runs locally and on the deployed URL.
2. The happy path works with a real Gnani API call.
3. Error path shows a friendly message.
4. No secrets in the diff.
5. The phase checklist item is ticked.

### C9. Git
- Small commits with clear messages, one per feature.
- Commit at the end of every phase; tag `phase-N`.
- Never commit `.env*`, audio recordings, or real personal data.
