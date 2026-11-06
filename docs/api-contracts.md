# KahaniGhar — API Contracts

This document defines the request/response contracts for all backend API routes.
Frontend and backend teams can develop independently against these contracts.

**Version:** 1.0  
**Last Updated:** 2026-11-05  
**Status:** Contract phase — not yet implemented

---

## Conventions

- All routes are **server-side only** (Next.js Route Handlers under `app/api/`).
- All Gnani API credentials stay on the server (`GNANI_API_KEY`, `LLM_KEY`, Supabase service role).
- Request/response bodies are JSON unless otherwise noted (multipart for audio upload).
- **Authentication**: Family ownership verified via server-side session (Supabase auth) — not detailed here; assume `familyId`/`memberId` available in route context.
- **Rate limiting**: Per-IP + per-family on all Gnani-calling routes (5,000 credits total).
- **Error format**: Consistent shape across all routes (see [Error Response](#error-response-format)).
- **Zod validation**: Every route validates input with Zod schemas defined in this doc.
- **Provider-specific fields**: Marked `TODO(verify)` where Gnani docs are ambiguous.

---

## 1. Common Types

### 1.1 Base Types (from `types/story.ts`)

```typescript
// Re-exported for API layer
type AgeBand = "3-5" | "6-8" | "9-10";
type StoryKind = "memory" | "folklore" | "generated";
type StoryLanguage = "hi-IN" | "en-IN" | "hi-en" | "mr-IN" | "ta-IN" | "te-IN";

interface ChildProfile {
  nickname: string;
  ageBand: AgeBand;
  interests: string[];
}

interface StoryScene {
  idx: number;
  text: string;
  choices?: string[]; // 2-3 options when present
}

interface StoryStructure {
  title: string;
  characters: string[];
  moral: string;
  scenes: StoryScene[];
}

interface Story {
  id: string;
  title: string;
  language: StoryLanguage;
  kind: StoryKind;
  ageBand: AgeBand;
  childNickname: string;
  interests: string[];
  narrator: string;
  structure: StoryStructure;
  createdAt: string; // Full ISO 8601 timestamp with timezone, e.g. 2026-11-05T14:30:00.123Z
  // Audio URLs are per-scene, returned by TTS API; not stored on Story.
}
```

### 1.2 Error Response Format

**All routes return this shape on error:**

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message (safe for UI)
    retryable: boolean;     // Whether client should retry
    status: number;         // HTTP status code
    details?: Record<string, unknown>; // Optional validation details
  };
}
```

**HTTP Status Codes:**
| Code | Meaning | Retryable |
|------|---------|-----------|
| 400  | Invalid request (validation failed) | false |
| 401  | Unauthorized (auth required) | false |
| 403  | Forbidden (not family member) | false |
| 404  | Not found | false |
| 429  | Rate limited (Gnani or local) | true |
| 500  | Internal server error | true |
| 502  | Upstream (Gnani/LLM) error | true |
| 503  | Service unavailable (credits exhausted) | true |

### 1.3 Success Response Wrapper

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}
```

---

## 2. POST /api/stories

**Create a new story from a transcript (text or edited STT output).**

### Request

```typescript
interface CreateStoryRequest {
  transcript: string;           // User's memory/idea (1-5000 chars)
  language: StoryLanguage;      // Target narration language
  child: ChildProfile;          // Child nickname, age band, interests
  kind: StoryKind;              // "memory" | "folklore" | "generated"
  interactive: boolean;         // Whether to include choice points
}
```

**Zod Schema:**
```typescript
const CreateStoryRequestSchema = z.object({
  transcript: z.string().min(1).max(5000),
  language: z.enum(["hi-IN", "en-IN", "hi-en", "mr-IN", "ta-IN", "te-IN"]),
  child: z.object({
    nickname: z.string().min(1).max(50),
    ageBand: z.enum(["3-5", "6-8", "9-10"]),
    interests: z.array(z.string().max(30)).max(10).default([]),
  }),
  kind: z.enum(["memory", "folklore", "generated"]).default("memory"),
  interactive: z.boolean().default(true),
});
```

### Response (201 Created)

```typescript
interface CreateStoryResponse {
  story: Story;                 // Full story with generated structure
}
```

### Flow
1. Validate request
2. Check rate limit (per family)
3. Call LLM (`generateStory`) with transcript + child profile + language + kind + interactive
4. Validate LLM output against `StoryStructureSchema` (retry once on failure)
5. Run safety check (`checkStoryStructureSafety`)
6. Persist to Supabase: `stories` + `scenes` tables
7. Return full `Story` object (without `audioUrl` — TTS generated on-demand)

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `VALIDATION_ERROR` | "Invalid request: ..." | Zod validation failed |
| `RATE_LIMITED` | "Too many requests. Please wait." | Per-family/IP limit exceeded |
| `LLM_FAILED` | "Story generation failed. Please try again." | LLM error after retry |
| `LLM_INVALID_JSON` | "Story generation returned invalid format." | Schema validation failed after retry |
| `SAFETY_VIOLATION` | "Generated story contains unsafe content." | Banned theme detected |
| `STORAGE_FAILED` | "Failed to save story." | Supabase error |

---

## 3. GET /api/stories

**List stories for the current family with optional filters.**

### Query Parameters

```typescript
interface ListStoriesQuery {
  query?: string;           // Search text (title, narrator, child nickname)
  language?: StoryLanguage | "all";
  kind?: StoryKind | "all";
  narrator?: string | "all";
  limit?: number;           // Default 20, max 50
  offset?: number;          // Default 0
}
```

**Zod Schema:**
```typescript
const ListStoriesQuerySchema = z.object({
  query: z.string().max(200).optional(),
  language: z.enum(["hi-IN", "en-IN", "hi-en", "mr-IN", "ta-IN", "te-IN", "all"]).optional(),
  kind: z.enum(["memory", "folklore", "generated", "all"]).optional(),
  narrator: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### Response (200 OK)

```typescript
interface ListStoriesResponse {
  stories: Story[];         // Array of stories (newest first)
  total: number;            // Total count for pagination
  hasMore: boolean;         // Whether more results exist
}
```

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `VALIDATION_ERROR` | "Invalid query parameters" | Zod validation failed |
| `UNAUTHORIZED` | "Authentication required" | No valid session |

---

## 4. GET /api/stories/:id

**Get a single story by ID (with family ownership check).**

### Path Parameter
- `id`: string (UUID)

### Response (200 OK)

```typescript
interface GetStoryResponse {
  story: Story;             // Full story including structure
}
```

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `NOT_FOUND` | "Story not found" | ID doesn't exist or not owned by family |
| `UNAUTHORIZED` | "Authentication required" | No valid session |

---

## 5. DELETE /api/stories/:id

**Delete a story (and its scenes, cached audio) by ID.**

### Path Parameter
- `id`: string (UUID)

### Response (200 OK)

```typescript
interface DeleteStoryResponse {
  deleted: true;
  id: string;
}
```

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `NOT_FOUND` | "Story not found" | ID doesn't exist or not owned by family |
| `UNAUTHORIZED` | "Authentication required" | No valid session |
| `STORAGE_FAILED` | "Failed to delete story" | Supabase error |

---

## 6. POST /api/stories/:id/branch

**Continue an interactive story after a child's choice.**

### Path Parameter
- `id`: string (UUID) — the story being branched

### Request

```typescript
interface BranchStoryRequest {
  choice: string;               // The exact choice text selected by child
  storySoFar: StoryScene[];     // All scenes up to the choice point (including the scene with choices)
  // NOTE: child profile (nickname, ageBand, interests) and language are NOT sent by client.
  // The route handler retrieves them from the authorized story record.
}
```

**Zod Schema:**
```typescript
const BranchStoryRequestSchema = z.object({
  choice: z.string().min(1).max(200),
  storySoFar: z.array(StorySceneSchema).min(1),
});
```

### Response (200 OK)

```typescript
interface BranchStoryResponse {
  scenes: StoryScene[];         // 1-2 new scenes reflecting the choice
  // Note: The story always moves toward a happy ending.
  // Hard limit: max 3 branch points total per story.
}
```

### Flow
1. Validate request
2. Verify story exists and belongs to family (using `familyId` from auth context)
3. Fetch story record to get `child_id`, `language`, `age_band`, `child_nickname`, `interests`
4. Resolve child profile from `children` table using `child_id`
5. Count existing branch points in `storySoFar` (scenes with `choices`)
6. If branch count >= 3: return final scene with moral (forced ending)
7. Call LLM (`branchStory`) with storySoFar + choice + child profile + language
8. Validate LLM output against `StoryStructureSchema` (retry once)
9. Run safety check
10. Persist new scenes to `scenes` table (append to story)
11. Return only newly generated scenes (client appends to existing story)

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `VALIDATION_ERROR` | "Invalid request: ..." | Zod validation failed |
| `NOT_FOUND` | "Story not found" | ID doesn't exist or not owned |
| `BRANCH_LIMIT_EXCEEDED` | "Story has reached maximum choices" | Already 3 branches (should return final scene instead) |
| `LLM_FAILED` | "Could not continue story. Please try again." | LLM error |
| `SAFETY_VIOLATION` | "Generated content was unsafe" | Banned theme detected |

---

## 7. POST /api/stt

**Speech-to-text: convert uploaded audio to transcript using Gnani Prisma.**

### Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio_file` | File | Yes | Audio blob (WAV/MP3/OGG, max 30s, ~5MB) |
| `language_code` | string | No | BCP-47 code (default: `hi-IN`) |
| `model` | string | No | STT model (default from config: `prisma-v2.5`) |
| `format` | string | No | `verbatim` \| `transcribe` \| `codemix` \| `transliterate` (default: `transcribe`) |
| `topic` | string | No | Domain hint for better accuracy |
| `keyterms` | string | No | JSON array of key terms to boost |

### Response (200 OK)

```typescript
interface SttResponse {
  transcript: string;           // Recognized text
  requestId: string;            // Gnani request ID for debugging
  model: string;                // Model used
  detectedLanguageCode?: string; // If auto-detected
  processingTime?: number;      // Ms
  endToEndLatency?: number;     // Ms
  truncated?: boolean;          // If audio was cut off
}
```

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `VALIDATION_ERROR` | "Invalid audio file" | Missing file, wrong format, >30s, >5MB |
| `EMPTY_AUDIO` | "Audio file is empty" | Zero-byte upload |
| `MAX_AUDIO_SIZE_EXCEEDED` | "Audio exceeds 30s limit" | File too large |
| `GNANI_AUTH_FAILED` | "STT service unavailable" | 401/403 from Gnani |
| `GNANI_RATE_LIMITED` | "STT rate limited. Please wait." | 429 from Gnani |
| `GNANI_ERROR` | "Speech recognition failed" | 5xx or Gnani error response |
| `TIMEOUT` | "STT request timed out" | >60s |
| `NETWORK_ERROR` | "Could not reach STT service" | Network failure |

### Notes
- **File validation**: Route must reject files >5MB before calling Gnani.
- **Language codes**: Support at least `hi-IN`, `en-IN`, `hi-en`, `mr-IN`, `ta-IN`, `te-IN`.
- **Format**: Default `transcribe`; `codemix` for Hinglish.
- **Retry**: Client should retry on `retryable: true` errors with exponential backoff.

---

## 8. POST /api/tts

**Text-to-speech: generate narration audio for a scene using Gnani Timbre.**

### Request

```typescript
interface TtsRequest {
  text: string;                 // Scene text to narrate (1-2000 chars)
  voice: string;                // Voice ID (e.g., "Pranav", "Kaveri", or cloned voice ID)
  language?: StoryLanguage;     // Language code (default: story language)
  model?: string;               // TTS model (default from config: `timbre-v2.5`)
  speed?: number;               // Playback speed (0.8, 1.0, 1.25)
  sceneId: string;              // Scene UUID for caching
  storyId: string;              // Story UUID for ownership check
}
```

**Zod Schema:**
```typescript
const TtsRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(100),
  language: z.enum(["hi-IN", "en-IN", "hi-en", "mr-IN", "ta-IN", "te-IN"]).optional(),
  model: z.string().max(50).optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  sceneId: z.string().uuid(),
  storyId: z.string().uuid(),
});
```

### Response (200 OK)

```typescript
interface TtsResponse {
  audioUrl: string;             // Signed URL to cached audio (Supabase Storage)
  cached: boolean;              // Whether served from cache
  format: "wav";                // Container format
  sampleRate: number;           // e.g., 44100
  durationEstimate?: number;    // Estimated duration in seconds
}
```

### Flow
1. Validate request
2. Verify story exists and belongs to family (using `familyId` from auth context)
3. Verify `voice_id` belongs to family (if cloned voice) via `voices` table
4. Map `sceneId` (UUID) to scene record; verify it belongs to the story
5. Check if cached audio exists for `sceneId` + `voice` + `language` + `model` (key: `tts/{model}/{language}/{voice}/{sceneId}.wav`)
6. If cached: return signed URL (300s expiry)
7. If not cached:
   - Call Gnani TTS (`synthesize`)
   - Store audio in Supabase Storage (private bucket `tts-cache`)
   - Return signed URL
8. Prefetch next scene in background (optional)

### Frontend Scene Index → UUID Mapping
The frontend tracks scenes by array index (0-based). The `sceneId` in TTS request must be the scene's UUID from the `scenes` table. The API adapter maps: `sceneId = story.scenes[sceneIndex].id` (where `id` is the UUID from the `scenes` table, not the `idx` field).

### Error Cases
| Code | Message | Cause |
|------|---------|-------|
| `VALIDATION_ERROR` | "Invalid request: ..." | Zod validation failed |
| `NOT_FOUND` | "Story or scene not found" | Invalid IDs |
| `UNAUTHORIZED` | "Voice not authorized for this family" | Voice ID not owned |
| `GNANI_AUTH_FAILED` | "TTS service unavailable" | 401/403 from Gnani |
| `GNANI_RATE_LIMITED` | "TTS rate limited. Please wait." | 429 from Gnani |
| `GNANI_ERROR` | "Speech synthesis failed" | 5xx or Gnani error |
| `TIMEOUT` | "TTS request timed out" | >60s |
| `NETWORK_ERROR` | "Could not reach TTS service" | Network failure |
| `CREDITS_EXHAUSTED` | "Narration is resting for now" | 402/quota error from Gnani |
| `STORAGE_FAILED` | "Failed to cache audio" | Supabase Storage error |

### Notes
- **Caching is mandatory** — never regenerate audio for same scene+voice+language+model.
- **Signed URLs**: Short-lived (5 min), regenerated on each request.
- **Voice authorization**: Cloned voices only usable by owning family.
- **Fallback**: On TTS failure, frontend shows text with "Retry narration" button.

---

## 9. Shared Zod Schemas (for route handlers)

These schemas should be defined in a shared module (e.g., `lib/api/schemas.ts`) and imported by both route handlers and frontend if needed.

```typescript
// lib/api/schemas.ts
import { z } from "zod";

// --- Base enums ---
export const AgeBandSchema = z.enum(["3-5", "6-8", "9-10"]);
export const StoryKindSchema = z.enum(["memory", "folklore", "generated"]);
export const StoryLanguageSchema = z.enum(["hi-IN", "en-IN", "hi-en", "mr-IN", "ta-IN", "te-IN"]);

// --- StoryScene (matches lib/llm/schema.ts) ---
export const StorySceneSchema = z.object({
  idx: z.number().int().nonnegative(),
  text: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(3).optional(),
});
export type StoryScene = z.infer<typeof StorySceneSchema>;

// --- ChildProfile ---
export const ChildProfileSchema = z.object({
  nickname: z.string().min(1).max(50),
  ageBand: AgeBandSchema,
  interests: z.array(z.string().max(30)).max(10).default([]),
});
export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// --- CreateStoryRequest ---
export const CreateStoryRequestSchema = z.object({
  transcript: z.string().min(1).max(5000),
  language: StoryLanguageSchema,
  child: ChildProfileSchema,
  kind: StoryKindSchema.default("memory"),
  interactive: z.boolean().default(true),
});
export type CreateStoryRequest = z.infer<typeof CreateStoryRequestSchema>;

// --- ListStoriesQuery ---
export const ListStoriesQuerySchema = z.object({
  query: z.string().max(200).optional(),
  language: StoryLanguageSchema.or(z.literal("all")).optional(),
  kind: StoryKindSchema.or(z.literal("all")).optional(),
  narrator: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListStoriesQuery = z.infer<typeof ListStoriesQuerySchema>;

// --- BranchStoryRequest ---
export const BranchStoryRequestSchema = z.object({
  choice: z.string().min(1).max(200),
  storySoFar: z.array(StorySceneSchema).min(1),
});
export type BranchStoryRequest = z.infer<typeof BranchStoryRequestSchema>;

// --- TtsRequest ---
export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(100),
  language: StoryLanguageSchema.optional(),
  model: z.string().max(50).optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  sceneId: z.string().uuid(),
  storyId: z.string().uuid(),
});
export type TtsRequest = z.infer<typeof TtsRequestSchema>;

// --- Error Response ---
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    status: z.number(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// --- Success Wrapper ---
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });
```

---

## 10. Authentication & Family Ownership

**Implemented in `lib/auth/types.ts`** — see `AuthContext` interface.

```typescript
interface AuthContext {
  familyId: string;
  memberId: string;
}
```

**Requirements:**
- All `/api/stories/*`, `/api/tts`, `/api/stt` routes require valid session.
- `getAuthContext(request)` (from `lib/auth/types.ts`) verifies Supabase session and returns `AuthContext`.
- Every data access must verify ownership using `familyId` from auth context (NEVER from client):
  - `stories.family_id = familyId`
  - `voices.family_id = familyId` (for TTS voice authorization)
  - `recordings.family_id = familyId` (for STT original recording)
  - `children.family_id = familyId`
  - `members.family_id = familyId`
- Use service-role Supabase client with explicit `.eq("family_id", familyId)` filters.
- Never trust client-supplied `familyId` or `memberId`.
- Mutating routes (POST, DELETE) must verify `Origin` header matches expected origin (CSRF protection).

---

## 11. Security Requirements (Explicit)

The following security measures are mandatory for all API route implementations:

### Authentication & Authorization
- **Every protected route** must call `requireAuth(request)` (from `lib/auth/types.ts`) before any data access.
- **Every story/recording/voice lookup** must filter by `familyId` from auth context.
- **Never trust** `familyId`, `memberId`, `storyId`, or `voiceId` supplied by the client without ownership verification.

### Data Privacy
- **Speaker embeddings** (`voices.speaker_embedding`) are **never** returned to the client.
- **Private storage paths** (`recordings.storage_path`, `scenes.audio_path`) are **never** exposed; only signed URLs are returned.
- **Voice cloning** requires explicit stored consent (`voices.consent_at` not null, `deleted_at` null) and family ownership.

### Storage
- Buckets `recordings` and `tts-cache` are **private** (public: false).
- Signed URLs expire (default 300s). Frontend must handle 403 by re-requesting.
- Service role bypasses RLS; ownership enforced via `assert*` helpers in `lib/db/queries.ts`.

### Input Validation & Rate Limiting
- **File uploads**: Server-side check for max 5MB and max 30s duration before calling Gnani.
- **Rate limiting**: Production must use Supabase advisory locks or Redis (not in-memory Map).
- **CSRF protection**: Mutating routes (POST, DELETE) must verify `Origin` header matches `NEXT_PUBLIC_APP_URL`.

### Error Handling
- All errors use the standard `ApiErrorResponse` format.
- Gnani errors include `retryable` flag for client-side exponential backoff.
- No sensitive data (audio, transcripts, embeddings) in logs.

---

## 12. Rate Limiting

**Per-route limits (configurable via env):**
| Route | Limit | Window |
|-------|-------|--------|
| POST /api/stories | 10 | 1 min |
| GET /api/stories | 30 | 1 min |
| GET /api/stories/:id | 30 | 1 min |
| DELETE /api/stories/:id | 10 | 1 min |
| POST /api/stories/:id/branch | 10 | 1 min |
| POST /api/stt | 5 | 1 min |
| POST /api/tts | 10 | 1 min |

**Implementation:** In-process Map with sliding window (see `lib/rateLimit.ts`). For production, use Supabase advisory locks or Redis.

---

## 12. Provider-Specific Details (Pending Verification)

The following Gnani API details are based on public docs and need verification before implementation:

### STT (Prisma v2.5)
- [ ] Exact endpoint: `POST /stt/v3` (confirmed)
- [ ] Multipart field name: `audio_file` (confirmed)
- [ ] Supported `format` values: `verbatim`, `transcribe`, `codemix`, `transliterate` (TODO: verify)
- [ ] `language_code` format: BCP-47 (e.g., `hi-IN`) (confirmed)
- [ ] **Hinglish (`hi-en`) handling**: Map to `language_code: "hi-IN"` with `format: "codemix"` (subject to Gnani documentation verification)
- [ ] Response field names: `request_id`, `transcript`, `model`, `detected_language_code`, `processing_time`, `end_to_end_latency`, `truncated` (TODO: verify exact casing)
- [ ] Error response shape: `{ detail: { error_code, message } }` (TODO: verify)

### TTS (Timbre v2.5)
- [ ] Exact endpoint: `POST /api/v1/ts/inference` (confirmed)
- [ ] Request body fields: `text`, `voice`, `model`, `language`, `speed`, `audio_config` (TODO: verify all)
- [ ] `audio_config` fields: `sample_rate`, `num_channels`, `sample_width`, `encoding`, `container`, `bitrate` (TODO: verify)
- [ ] Supported containers: `wav`, `mp3`, `ogg`, `raw`, `mulaw`, `alaw` (TODO: verify)
- [ ] Response: raw binary audio (confirmed)
- [ ] Error response shape: same as STT (TODO: verify)

### Voice Cloning (vachana-vc-v1)
- [ ] Endpoint: `POST /api/v1/tts/voice-clone/embeddings` (TODO: verify)
- [ ] Request: multipart `audio_file` (5-30s WAV/MP3)
- [ ] Response: `{ embedding, shape, dtype }` (TODO: verify)
- [ ] Usage: pass `speaker_embedding` in TTS request (TODO: verify field name)

### LLM (Evon v3.3)
- [ ] OpenAI-compatible endpoint (TODO: confirm URL)
- [ ] Model identifier (TODO: confirm)
- [ ] JSON mode support: `response_format: { type: "json_object" }` (assumed)

---

## 13. Frontend Integration Notes

The frontend `StoryService` interface (`lib/services/story-service.ts`) maps to these APIs:

| StoryService Method | API Route |
|---------------------|-----------|
| `list()` | GET /api/stories |
| `get(id)` | GET /api/stories/:id |
| `create(input)` | POST /api/stories |
| `remove(id)` | DELETE /api/stories/:id |
| `search(filters)` | GET /api/stories?filters |

**No changes to `StoryService` interface needed** — the mock implementation will be swapped for an API-calling implementation in `lib/services/api-story-service.ts` when backend is ready.

**New services needed:**
- `SttService.transcribe(audioBlob)` → POST /api/stt
- `TtsService.synthesize(options)` → POST /api/tts

These will be added in `lib/services/` without modifying existing interfaces.

---

## 15. Additional Contract Clarifications

### Child Record Creation/Reuse
- On story creation, the route handler checks if a `children` record exists for the `familyId` with matching `nickname` + `age_band`.
- If found, reuse `child_id`; if not, create new `children` record.
- This allows multiple stories for the same child without duplicate records.

### Narrator Member ID Assignment
- The authenticated `memberId` (from `AuthContext`) becomes `narrator_member_id` on the `stories` record.
- This ties the story to the family member who created it.

### Source Recording Linkage
- If the story was created from an STT transcript (via `/api/stt`), the `recordings` record created during STT is linked via `source_recording_id` on `stories`.
- The `recordings` record stores the original audio path, language, duration, and transcript.

### StoryStructure Reconstruction
- The `stories.structure` JSONB column stores the denormalized `StoryStructure` (title, characters, moral, scenes).
- The `scenes` table stores normalized per-scene data (idx, text, choice_prompt, choices, audio_path, voice_id, model).
- For API responses, read `stories.structure` directly (denormalized) to match frontend `Story` type.
- The `scenes` table is the source of truth for TTS caching (per-scene audio_path) and branching.

### Scene-Level TTS Cache Association
- TTS cache key: `tts/{model}/{language}/{voice}/{sceneId}.wav` where `sceneId` is the UUID from `scenes.id`.
- When TTS is generated, the returned signed URL is stored in `scenes.audio_path` (or a separate cache table).
- On subsequent requests, check `scenes.audio_path` for existing cached audio before calling Gnani.

### Expired Audio URL Refresh
- Signed URLs expire after 300s (configurable).
- Frontend `AudioPlayer` must handle 403/401 responses by re-requesting `/api/tts` for the same scene.
- The TTS route will regenerate a new signed URL (from cache if available).

### Branch Count Calculation
- Branch count = number of scenes in the story (from `scenes` table) where `choices` is not null and array length > 0.
- Hard limit: 3 branch points per story.
- When branch count >= 3, the next branch request returns a final scene with moral (forced happy ending).

---

## 16. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-11-05 | Initial contract definition |