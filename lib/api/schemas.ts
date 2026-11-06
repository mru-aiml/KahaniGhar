// Zod schemas for API request/response validation.
// Matches the API Contract v1.1 exactly.

import { z } from "zod";
import {
  AgeBandSchema as LlmAgeBandSchema,
  StorySceneSchema as LlmStorySceneSchema,
  StoryStructureSchema as LlmStoryStructureSchema,
  StoryGenerateRequestSchema as LlmStoryGenerateRequestSchema,
  StoryBranchRequestSchema as LlmStoryBranchRequestSchema,
} from "@/lib/llm/schema";

// ============================================
// Base Types (re-exported from llm/schema for convenience)
// ============================================

export const AgeBandSchema = LlmAgeBandSchema;
export const StoryKindSchema = z.enum(["memory", "folklore", "generated"]);
export const StoryLanguageSchema = z.enum(["hi-IN", "en-IN", "hi-en", "mr-IN", "ta-IN", "te-IN"]);
export const StorySceneSchema = LlmStorySceneSchema;
export const StoryStructureSchema = LlmStoryStructureSchema;

export type AgeBand = z.infer<typeof AgeBandSchema>;
export type StoryKind = z.infer<typeof StoryKindSchema>;
export type StoryLanguage = z.infer<typeof StoryLanguageSchema>;
export type StoryScene = z.infer<typeof StorySceneSchema>;
export type StoryStructure = z.infer<typeof StoryStructureSchema>;

// ============================================
// Child Profile
// ============================================

export const ChildProfileSchema = z.object({
  nickname: z.string().min(1).max(50),
  ageBand: AgeBandSchema,
  interests: z.array(z.string().max(30)).max(10).default([]),
});

export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// ============================================
// Create Story Request/Response
// ============================================

export const CreateStoryRequestSchema = z.object({
  transcript: z.string().min(1).max(5000),
  language: StoryLanguageSchema,
  child: ChildProfileSchema,
  kind: StoryKindSchema.default("memory"),
  interactive: z.boolean().default(true),
});

export type CreateStoryRequest = z.infer<typeof CreateStoryRequestSchema>;

// ============================================
// Story (as returned to client)
// ============================================

export const StorySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  language: StoryLanguageSchema,
  kind: StoryKindSchema,
  ageBand: AgeBandSchema,
  childNickname: z.string().min(1),
  interests: z.array(z.string()).default([]),
  narrator: z.string().min(1),
  structure: StoryStructureSchema,
  createdAt: z.string().datetime({ offset: true }), // Full ISO 8601 with timezone
});

export type Story = z.infer<typeof StorySchema>;

// ============================================
// List Stories Query/Response
// ============================================

export const ListStoriesQuerySchema = z.object({
  query: z.string().max(200).optional(),
  language: StoryLanguageSchema.or(z.literal("all")).optional(),
  kind: StoryKindSchema.or(z.literal("all")).optional(),
  narrator: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListStoriesQuery = z.infer<typeof ListStoriesQuerySchema>;

export const ListStoriesResponseSchema = z.object({
  stories: z.array(StorySchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type ListStoriesResponse = z.infer<typeof ListStoriesResponseSchema>;

// ============================================
// Get Story Response
// ============================================

export const GetStoryResponseSchema = z.object({
  story: StorySchema,
});

export type GetStoryResponse = z.infer<typeof GetStoryResponseSchema>;

// ============================================
// Delete Story Response
// ============================================

export const DeleteStoryResponseSchema = z.object({
  deleted: z.literal(true),
  id: z.string().uuid(),
});

export type DeleteStoryResponse = z.infer<typeof DeleteStoryResponseSchema>;

// ============================================
// Branch Story Request/Response
// ============================================

export const BranchStoryRequestSchema = z.object({
  choice: z.string().min(1).max(200),
  storySoFar: z.array(StorySceneSchema).min(1),
});

export type BranchStoryRequest = z.infer<typeof BranchStoryRequestSchema>;

export const BranchStoryResponseSchema = z.object({
  scenes: z.array(StorySceneSchema).min(1).max(2),
});

export type BranchStoryResponse = z.infer<typeof BranchStoryResponseSchema>;

// ============================================
// STT Request/Response
// ============================================

// STT request is multipart/form-data, so we validate parsed fields
export const SttRequestFieldsSchema = z.object({
  language_code: StoryLanguageSchema.optional(),
  model: z.string().max(50).optional(),
  format: z.enum(["verbatim", "transcribe", "codemix", "transliterate"]).optional(),
  topic: z.string().max(200).optional(),
  keyterms: z.string().optional(), // JSON string array
});

export type SttRequestFields = z.infer<typeof SttRequestFieldsSchema>;

// STT response
export const SttResponseSchema = z.object({
  transcript: z.string(),
  requestId: z.string(),
  model: z.string(),
  detectedLanguageCode: z.string().optional(),
  processingTime: z.number().int().nonnegative().optional(),
  endToEndLatency: z.number().int().nonnegative().optional(),
  truncated: z.boolean().optional(),
});

export type SttResponse = z.infer<typeof SttResponseSchema>;

// ============================================
// TTS Request/Response
// ============================================

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

export const TtsResponseSchema = z.object({
  audioUrl: z.string().url(),
  cached: z.boolean(),
  format: z.literal("wav"),
  sampleRate: z.number().int().positive(),
  durationEstimate: z.number().positive().optional(),
});

export type TtsResponse = z.infer<typeof TtsResponseSchema>;

// ============================================
// Error Response (standard across all routes)
// ============================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  status: z.number().int().positive(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// ============================================
// Success Response Wrapper
// ============================================

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// Standard Error Codes
// ============================================

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  LLM_FAILED: "LLM_FAILED",
  LLM_INVALID_JSON: "LLM_INVALID_JSON",
  SAFETY_VIOLATION: "SAFETY_VIOLATION",
  STORAGE_FAILED: "STORAGE_FAILED",
  EMPTY_AUDIO: "EMPTY_AUDIO",
  MAX_AUDIO_SIZE_EXCEEDED: "MAX_AUDIO_SIZE_EXCEEDED",
  GNANI_AUTH_FAILED: "GNANI_AUTH_FAILED",
  GNANI_RATE_LIMITED: "GNANI_RATE_LIMITED",
  GNANI_ERROR: "GNANI_ERROR",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  CREDITS_EXHAUSTED: "CREDITS_EXHAUSTED",
  BRANCH_LIMIT_EXCEEDED: "BRANCH_LIMIT_EXCEEDED",
} as const;

// ============================================
// Retryable Status Codes
// ============================================

export const RETRYABLE_STATUS_CODES: Set<number> = new Set([
  429, // TOO_MANY_REQUESTS
  500, // INTERNAL_SERVER_ERROR
  502, // BAD_GATEWAY
  503, // SERVICE_UNAVAILABLE
]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

// ============================================
// Audio Constraints
// ============================================

export const AUDIO_LIMITS = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxDurationSeconds: 30,
  allowedMimeTypes: ["audio/wav", "audio/mp3", "audio/ogg", "audio/mpeg", "audio/webm"] as const,
} as const;

export function validateAudioFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
  if (file.size === 0) {
    return { valid: false, error: "Audio file is empty" };
  }
  if (file.size > AUDIO_LIMITS.maxBytes) {
    return { valid: false, error: `Audio file exceeds ${AUDIO_LIMITS.maxBytes} bytes (max 30s)` };
  }
  if (!AUDIO_LIMITS.allowedMimeTypes.includes(file.type as (typeof AUDIO_LIMITS.allowedMimeTypes)[number])) {
    return { valid: false, error: `Unsupported audio format: ${file.type}` };
  }
  return { valid: true };
}

// Re-export LLM schemas for convenience
export {
  StoryGenerateRequestSchema,
  StoryBranchRequestSchema,
} from "@/lib/llm/schema";