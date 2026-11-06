# KahaniGhar — Frontend/Backend Integration Checklist

This checklist tracks the work needed to connect the frontend to the backend APIs.
Each item can be worked on independently once contracts are agreed.

**Status Legend:** `☐` Not Started · `🔄` In Progress · `✅` Done · `⚠️` Blocked

---

## 1. Backend API Implementation

### 1.1 Core Story Routes
| Item | Route | Status | Notes |
|------|-------|--------|-------|
| 1.1.1 | POST /api/stories | ☐ | Create story: validate → LLM → safety → persist |
| 1.1.2 | GET /api/stories | ☐ | List with filters, pagination |
| 1.1.3 | GET /api/stories/:id | ☐ | Single story with ownership check |
| 1.1.4 | DELETE /api/stories/:id | ☐ | Cascade delete scenes + cached audio |
| 1.1.5 | POST /api/stories/:id/branch | ☐ | Branch story: LLM → safety → persist new scenes |

### 1.2 Audio Routes
| Item | Route | Status | Notes |
|------|-------|--------|-------|
| 1.2.1 | POST /api/stt | ☐ | Multipart upload → Gnani Prisma → transcript |
| 1.2.2 | POST /api/tts | ☐ | Cache check → Gnani Timbre → Storage → signed URL |

### 1.3 Shared Infrastructure
| Item | Component | Status | Notes |
|------|-----------|--------|-------|
| 1.3.1 | Zod schemas (`lib/api/schemas.ts`) | ☐ | All request/response validation |
| 1.3.2 | Error handling middleware | ☐ | Consistent `ApiErrorResponse` format |
| 1.3.3 | Rate limiting (`lib/rateLimit.ts`) | ☐ | Per-IP + per-family (in-memory for dev, Supabase/Redis for prod) |
| 1.3.4 | Auth context (`lib/auth/types.ts`) | ☐ | `AuthContext` interface + `getAuthContext`/`requireAuth` |
| 1.3.5 | Supabase service client helpers | ☐ | Ownership-verified queries |
| 1.3.6 | Gnani client integration | ☐ | Use existing `lib/gnani/stt.ts`, `tts.ts` |
| 1.3.7 | LLM client integration | ☐ | Use existing `lib/llm/client.ts` |
| 1.3.8 | Safety check integration | ☐ | Use existing `lib/safety/content.ts` |
| 1.3.9 | CSRF/origin verification | ☐ | Verify `Origin` header on mutating routes |
| 1.3.10 | File size/duration validation | ☐ | Server-side check before Gnani calls |

### 1.4 Database & Storage
| Item | Component | Status | Notes |
|------|-----------|--------|-------|
| 1.4.1 | Supabase migrations applied | ☐ | Run `supabase/migrations/0001_init.sql` |
| 1.4.2 | Storage buckets created | ☐ | `recordings`, `tts-cache` (private) |
| 1.4.3 | RLS policies enabled | ☐ | Family isolation on all tables |
| 1.4.4 | Signed URL helper | ☐ | `lib/db/queries.ts::signedStorageUrl` |

---

## 2. Frontend Integration

### 2.1 API Service Layer
| Item | Service | Status | Notes |
|------|---------|--------|-------|
| 2.1.1 | `ApiStoryService` | ☐ | Implements `StoryService` interface, calls `/api/stories/*` |
| 2.1.2 | `SttService` | ☐ | `transcribe(blob)` → POST /api/stt |
| 2.1.3 | `TtsService` | ☐ | `synthesize(options)` → POST /api/tts |
| 2.1.4 | Shared API client | ☐ | `fetch` wrapper with auth, error handling, retries |
| 2.1.5 | Request/response transforms | ☐ | Date parsing, scene UUID mapping, error normalization |
| 2.1.6 | Retry logic | ☐ | Exponential backoff for `retryable: true` errors |
| 2.1.7 | Signed URL expiry handling | ☐ | 403 → re-request TTS |
| 2.1.8 | Scene index → UUID mapping | ☐ | `sceneId = story.scenes[sceneIndex].id` |

### 2.2 Component Wiring
| Item | Component | Status | Notes |
|------|-----------|--------|-------|
| 2.2.1 | `/create` page | ☐ | Add audio recorder → STT → editable transcript → generate |
| 2.2.2 | `/story/[id]` page | ☐ | Replace mock AudioPlayer with real TTS calls per scene |
| 2.2.3 | `/story/[id]` page | ☐ | Wire ChoiceCards to POST /api/stories/:id/branch |
| 2.2.4 | `/library` page | ☐ | Already uses StoryService — swap to ApiStoryService |
| 2.2.5 | `/storybook/[id]` page | ☐ | Already uses StoryService — swap to ApiStoryService |
| 2.2.6 | Error boundaries | ✅ | Already implemented (refinement phase) |

### 2.3 State & Persistence
| Item | Component | Status | Notes |
|------|-----------|--------|-------|
| 2.3.1 | Remove localStorage mock | ☐ | `mockStoryService` → `apiStoryService` |
| 2.3.2 | Optimistic updates | ☐ | For create/delete/branch (optional) |
| 2.3.3 | Loading/error states | ✅ | Already in components |

### 2.4 Audio Features
| Item | Feature | Status | Notes |
|------|---------|--------|-------|
| 2.4.1 | MediaRecorder component | ☐ | `components/Recorder.tsx` — record, waveform, timer |
| 2.4.2 | Transcript editor | ☐ | Editable text area after STT |
| 2.4.3 | AudioPlayer with real audio | ☐ | HTMLAudioElement + signed URLs, prefetch next |
| 2.4.4 | Voice selection UI | ☐ | VoicePicker for TTS (preset + cloned) |
| 2.4.5 | STT for choice selection | ☐ | Voice input for ChoiceCards (P1) |

---

## 3. Gnani Integration Verification

| Item | Task | Status | Notes |
|------|------|--------|-------|
| 3.1 | STT curl test (Hindi) | ☐ | Verify endpoint, auth, response format |
| 3.2 | STT curl test (Hinglish) | ☐ | Test `codemix` format |
| 3.3 | TTS curl test (Timbre v2.5) | ☐ | Verify voices, languages, audio output |
| 3.4 | TTS curl test (cloned voice) | ☐ | If voice cloning approved |
| 3.5 | LLM endpoint test | ☐ | Evon v3.3 or Plan B — JSON output |
| 3.6 | Rate limit behavior | ☐ | Confirm 429 response format |
| 3.7 | Error code mapping | ☐ | Map Gnani codes to our `ApiError.code` |
| 3.8 | Credit monitoring | ☐ | Track usage, warn at 80% |

---

## 4. Supabase Configuration

| Item | Task | Status | Notes |
|------|------|--------|-------|
| 4.1 | Project created | ☐ | Free tier |
| 4.2 | Database migrations run | ☐ | `0001_init.sql` |
| 4.3 | Storage buckets | ☐ | `recordings`, `tts-cache` |
| 4.4 | RLS policies | ☐ | Family isolation |
| 4.5 | Service role key in Vercel | ☐ | Server-only env var |
| 4.6 | Anon key in Vercel | ☐ | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 4.7 | URL in Vercel | ☐ | `NEXT_PUBLIC_SUPABASE_URL` |

---

## 5. Environment Variables

### Server-only (never in frontend bundle)
| Variable | Description | Status |
|----------|-------------|--------|
| `GNANI_API_KEY` | Gnani API key (5000 credits) | ☐ |
| `GNANI_BASE_URL` | `https://api.vachana.ai` | ☐ |
| `GNANI_STT_MODEL` | `prisma-v2.5` | ☐ |
| `GNANI_TTS_MODEL` | `timbre-v2.5` | ☐ |
| `GNANI_VC_MODEL` | `vachana-vc-v1` (if approved) | ☐ |
| `LLM_URL` | Evon endpoint (OpenAI-compatible) | ☐ |
| `LLM_KEY` | LLM API key (if needed) | ☐ |
| `LLM_MODEL` | `gnani-evon-v3.3` | ☐ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for server queries | ☐ |

### Client-safe (prefixed `NEXT_PUBLIC_`)
| Variable | Description | Status |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ☐ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key for browser client | ☐ |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL | ☐ |

---

## 6. Testing & Validation

| Item | Test | Status | Notes |
|------|------|--------|-------|
| 6.1 | Contract test: POST /api/stories | ☐ | Zod validation, 201 response shape |
| 6.2 | Contract test: GET /api/stories | ☐ | Filters, pagination, 200 shape |
| 6.3 | Contract test: GET /api/stories/:id | ☐ | 200 + 404 shapes |
| 6.4 | Contract test: DELETE /api/stories/:id | ☐ | 200 + 404 shapes |
| 6.5 | Contract test: POST /api/stories/:id/branch | ☐ | Branch logic, 3-limit enforcement |
| 6.6 | Contract test: POST /api/stt | ☐ | Multipart, 200 + error shapes |
| 6.7 | Contract test: POST /api/tts | ☐ | Cache hit/miss, signed URL format |
| 6.8 | E2E: Create → Narrate → Branch → Save | ☐ | Full happy path |
| 6.9 | E2E: STT → Edit → Generate | ☐ | Voice input flow |
| 6.10 | E2E: Library search + delete | ☐ | Filters work, delete persists |
| 6.11 | Error boundary triggers | ☐ | Network errors caught gracefully |
| 6.12 | Rate limit handling | ☐ | 429 → retry with backoff |
| 6.13 | Credits exhausted handling | ☐ | TTS fallback to text |
| 6.14 | Mobile Safari audio playback | ☐ | Autoplay policy handling |
| 6.15 | Accessibility audit | ✅ | Done in refinement phase |

---

## 7. Deployment

| Item | Task | Status | Notes |
|------|------|--------|-------|
| 7.1 | Vercel project connected | ☐ | GitHub repo |
| 7.2 | Env vars configured in Vercel | ☐ | All from section 5 |
| 7.3 | Build passes on Vercel | ☐ | `npm run build` |
| 7.4 | Preview deployments work | ☐ | PR previews |
| 7.5 | Production deployment | ☐ | Custom domain (optional) |
| 7.6 | Supabase connected to Vercel | ☐ | Same region |

---

## 8. Demo Preparation

| Item | Task | Status | Notes |
|------|------|--------|-------|
| 8.1 | Seed demo stories in Supabase | ☐ | 3-4 stories for library |
| 8.2 | Record demo STT clips | ☐ | Hindi, Hinglish, English |
| 8.3 | Test TTS with demo voices | ☐ | Timbre v2.5 voices |
| 8.4 | 60-second demo script | ☐ | Per `design.md` section 9 |
| 8.5 | Record 3 demo takes | ☐ | Phone on mobile data |
| 8.6 | Public post drafted | ☐ | LinkedIn/X with hashtags |

---

## 9. Documentation

| Item | Doc | Status | Notes |
|------|-----|--------|-------|
| 9.1 | API contracts (`docs/api-contracts.md`) | ✅ | This phase |
| 9.2 | Integration checklist (`docs/integration-checklist.md`) | ✅ | This phase |
| 9.3 | README with setup steps | ☐ | For judges |
| 9.4 | `.env.example` | ☐ | All vars with placeholders |
| 9.5 | Architecture decision log | ☐ | Key choices (Evon Plan A/B, etc.) |

---

## 13. Data Flow Clarifications (from api-contracts.md §15)

| Item | Clarification | Status | Notes |
|------|---------------|--------|-------|
| 13.1 | Child record creation/reuse | ☐ | Match by familyId + nickname + ageBand |
| 13.2 | Narrator member_id assignment | ☐ | From authenticated `memberId` |
| 13.3 | Source recording linkage | ☐ | `source_recording_id` from STT flow |
| 13.4 | StoryStructure reconstruction | ☐ | Read from `stories.structure` JSONB |
| 13.5 | Scene-level TTS cache association | ☐ | `scenes.audio_path` + cache key |
| 13.6 | Expired audio URL refresh | ☐ | 403 → re-request TTS |
| 13.7 | Branch count calculation | ☐ | Scenes with non-empty `choices` |

---

## 14. Blocker Tracking

| Blocker | Description | Owner | Resolution Target |
|---------|-------------|-------|-------------------|
| Evon v3.3 access | Weights not yet available; need HF access or hosted endpoint | Backend | Day 0 (Discord) |
| Voice cloning eligibility | Not confirmed if covered by 5000 credits | Backend | Day 0 (Discord) |
| Gnani API key | Need to generate at app.gnani.ai/voice | Both | Day 0 |
| Supabase project | Need to create and run migrations | Backend | Day 1 |
| STT/TTS curl tests | Must verify actual endpoint formats before coding | Backend | Day 1 |

---

## 11. Priority Order (from phase.md)

**P0 (Must for demo):**
1. POST /api/stories + LLM integration
2. POST /api/tts + caching
3. POST /api/stt
4. GET/DELETE /api/stories (library)
5. POST /api/stories/:id/branch (interactive)

**P1 (Should):**
6. Voice cloning (if approved)
7. Grandma's Storybook page
8. Library search/filter polish

**P2 (Stretch):**
9. Realtime STT (WebSocket)
10. Extra languages

---

## 12. Sign-off Criteria

Frontend and backend can integrate independently when:

- [ ] `docs/api-contracts.md` reviewed and approved by both teams
- [ ] Zod schemas in `lib/api/schemas.ts` match contracts exactly
- [ ] Mock `StoryService` has API-compatible replacement ready to swap
- [ ] All route handlers return correct success/error shapes
- [ ] Gnani curl tests pass and response formats documented
- [ ] Supabase schema matches architecture.md section 4
- [ ] Environment variables configured in Vercel
- [ ] `npm run build` passes on both frontend and backend

---

*Last updated: 2026-11-05*  
*Contract version: 1.1*