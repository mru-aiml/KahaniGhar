// STT Service - Speech to Text using Gnani Prisma via backend API

import { apiClient, ApiError } from "./api-client";

export interface SttOptions {
  audio: Blob;
  languageCode?: string;
  model?: string;
  format?: "verbatim" | "transcribe" | "codemix" | "transliterate";
  topic?: string;
  keyterms?: string[];
}

export interface SttResult {
  transcript: string;
  requestId: string;
  model: string;
  detectedLanguageCode?: string;
  processingTime?: number;
  endToEndLatency?: number;
  truncated?: boolean;
  recordingId?: string;
}

export class SttService {
  private basePath = "/stt";

  async transcribe(audioBlob: Blob, options: Partial<SttOptions> = {}): Promise<SttResult> {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.wav");

    if (options.languageCode) formData.append("language_code", options.languageCode);
    if (options.model) formData.append("model", options.model);
    if (options.format) formData.append("format", options.format);
    if (options.topic) formData.append("topic", options.topic);
    if (options.keyterms?.length) formData.append("keyterms", JSON.stringify(options.keyterms));

    try {
      const response = await apiClient.postForm<{
        success: true;
        data: SttResult;
      }>(this.basePath, formData, { timeout: 60_000 });

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        // Map specific error codes
        if (error.code === "EMPTY_AUDIO" || error.code === "MAX_AUDIO_SIZE_EXCEEDED") {
          throw new ApiError("VALIDATION_ERROR", 400, false, error.details);
        }
        if (error.status === 429 || error.code === "GNANI_RATE_LIMITED") {
          throw new ApiError("RATE_LIMITED", 429, true, error.details);
        }
        if (error.code === "GNANI_AUTH_FAILED") {
          throw new ApiError("SERVICE_UNAVAILABLE", 503, false, error.details);
        }
      }
      throw error;
    }
  }
}

export const sttService = new SttService();