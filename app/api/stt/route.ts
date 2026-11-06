// POST /api/stt - Speech to text using Gnani Prisma

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { getRouteAuth, requireRouteOrigin } from "@/lib/api/auth";
import { SttRequestFieldsSchema, SttResponseSchema, AUDIO_LIMITS, validateAudioFile } from "@/lib/api/schemas";
import { transcribe } from "@/lib/gnani/stt";
import { createRecording } from "@/lib/db/queries";
import { uploadToStorage } from "@/lib/db/queries";
import { validateSupabaseEnv, validateGnaniEnv } from "@/lib/db/queries";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// POST /api/stt - Speech to text
export const POST = withErrorHandling(async (request: NextRequest) => {
  validateSupabaseEnv();
  validateGnaniEnv();

  await requireRouteOrigin(request);
  const { familyId, memberId } = await getRouteAuth();

  // Parse multipart form data
  const formData = await request.formData();
  const audioFile = formData.get("audio_file") as File | null;
  const languageCode = formData.get("language_code") as string | null;
  const model = formData.get("model") as string | null;
  const format = formData.get("format") as string | null;
  const topic = formData.get("topic") as string | null;
  const keyterms = formData.get("keyterms") as string | null;

  if (!audioFile) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing audio_file in multipart form data",
          retryable: false,
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  // Validate audio file
  const audioValidation = validateAudioFile({ size: audioFile.size, type: audioFile.type });
  if (!audioValidation.valid) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: audioValidation.error || "Invalid audio file",
          retryable: false,
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  // Validate request fields
  const fieldsValidation = SttRequestFieldsSchema.safeParse({
    language_code: languageCode || undefined,
    model: model || undefined,
    format: format || undefined,
    topic: topic || undefined,
    keyterms: keyterms || undefined,
  });

  if (!fieldsValidation.success) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request fields",
          retryable: false,
          status: 400,
          details: { issues: fieldsValidation.error.issues },
        },
      },
      { status: 400 }
    );
  }

  // Convert File to ArrayBuffer
  const audioBuffer = await audioFile.arrayBuffer();

  // Upload to storage (recordings bucket)
  const storagePath = `recordings/${memberId}/${Date.now()}-${audioFile.name}`;
  await uploadToStorage("recordings", storagePath, audioBuffer);

  // Call Gnani STT
  const sttResult = await transcribe({
    audio: audioBuffer,
    filename: audioFile.name,
    mimeType: audioFile.type,
    languageCode: fieldsValidation.data.language_code,
    model: fieldsValidation.data.model,
    format: fieldsValidation.data.format,
    topic: fieldsValidation.data.topic,
    keyterms: fieldsValidation.data.keyterms ? JSON.parse(fieldsValidation.data.keyterms) : undefined,
  });

  // Create recording record
  const recording = await createRecording({
    memberId,
    storagePath,
    language: sttResult.detectedLanguageCode || fieldsValidation.data.language_code || "hi-IN",
    durationS: null, // Could be calculated from audio
    transcript: sttResult.transcript,
  });

  // Return response
  return Response.json(
    {
      success: true,
      data: {
        transcript: sttResult.transcript,
        requestId: sttResult.requestId,
        model: sttResult.model,
        detectedLanguageCode: sttResult.detectedLanguageCode,
        processingTime: sttResult.processingTime,
        endToEndLatency: sttResult.endToEndLatency,
        truncated: sttResult.truncated,
        recordingId: recording.id,
      },
    },
    { status: 200 }
  );
});