// POST /api/tts - Text to speech using Gnani Timbre

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { getRouteAuth, requireRouteOrigin, parseJsonBodyOrThrow } from "@/lib/api/auth";
import { TtsRequestSchema, TtsResponseSchema } from "@/lib/api/schemas";
import { synthesize, ttsCacheKey } from "@/lib/gnani/tts";
import { getStoryByIdForFamily, getScenesByStoryId, assertVoiceOfFamily, getVoiceByIdForTts, updateSceneAudioPath } from "@/lib/db/queries";
import { uploadToStorage, signedStorageUrl } from "@/lib/db/queries";
import { validateSupabaseEnv, validateGnaniEnv } from "@/lib/db/queries";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// POST /api/tts - Text to speech
export const POST = withErrorHandling(async (request: NextRequest) => {
  validateSupabaseEnv();
  validateGnaniEnv();

  await requireRouteOrigin(request);
  const { familyId } = await getRouteAuth();

  // Parse and validate request body
  const input = await parseJsonBodyOrThrow(request, TtsRequestSchema);

  // Verify story belongs to family
  const story = await getStoryByIdForFamily(input.storyId, familyId);
  if (!story) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Story not found",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Verify scene belongs to story
  const scenes = await getScenesByStoryId(input.storyId);
  const scene = scenes.find((s) => s.id === input.sceneId);
  if (!scene) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Scene not found in story",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Verify voice is authorized for this family
  await assertVoiceOfFamily(input.voice, familyId);

  // Get voice details (including embedding for cloned voices)
  const voice = await getVoiceByIdForTts(input.voice);
  if (!voice) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Voice not found",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Check if already cached
  const cacheKey = ttsCacheKey({
    sceneId: input.sceneId,
    voice: input.voice,
    language: input.language || story.language,
    model: input.model || "timbre-v2.5",
  });

  // Check if scene already has cached audio
  if (scene.audio_path) {
    const audioUrl = await signedStorageUrl("tts-cache", scene.audio_path);
    return Response.json(
      {
        success: true,
        data: {
          audioUrl,
          cached: true,
          format: "wav",
          sampleRate: 44100,
        },
      },
      { status: 200 }
    );
  }

  // Call Gnani TTS
  const audioBuffer = await synthesize({
    text: input.text,
    voice: input.voice,
    language: input.language || story.language,
    model: input.model,
    speed: input.speed,
  });

  // Upload to storage (tts-cache bucket)
  await uploadToStorage("tts-cache", cacheKey, audioBuffer);

  // Update scene with audio path
  await updateSceneAudioPath(input.sceneId, cacheKey);

  // Generate signed URL
  const audioUrl = await signedStorageUrl("tts-cache", cacheKey);

  return Response.json(
    {
      success: true,
      data: {
        audioUrl,
        cached: false,
        format: "wav",
        sampleRate: 44100,
      },
    },
    { status: 200 }
  );
});