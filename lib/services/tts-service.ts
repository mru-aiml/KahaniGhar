// TTS Service - Text to Speech using Gnani Timbre via backend API

import { apiClient, ApiError } from "./api-client";

export interface TtsOptions {
  text: string;
  voice: string;
  language?: string;
  model?: string;
  speed?: number;
  sceneId: string;
  storyId: string;
}

export interface TtsResult {
  audioUrl: string;
  cached: boolean;
  format: "wav";
  sampleRate: number;
  durationEstimate?: number;
}

export class TtsService {
  private basePath = "/tts";

  async synthesize(options: TtsOptions): Promise<TtsResult> {
    try {
      const response = await apiClient.post<{
        success: true;
        data: TtsResult;
      }>(this.basePath, options, { timeout: 60_000 });

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          throw new ApiError("NOT_FOUND", 404, false, error.details);
        }
        if (error.status === 403 || error.code === "UNAUTHORIZED") {
          throw new ApiError("FORBIDDEN", 403, false, error.details);
        }
        if (error.status === 429 || error.code === "GNANI_RATE_LIMITED") {
          throw new ApiError("RATE_LIMITED", 429, true, error.details);
        }
        if (error.code === "CREDITS_EXHAUSTED") {
          throw new ApiError("SERVICE_UNAVAILABLE", 503, false, { message: "Narration is resting for now" });
        }
        if (error.status >= 500) {
          throw new ApiError("TTS_FAILED", 500, true, error.details);
        }
      }
      throw error;
    }
  }

  // Handle expired signed URLs by retrying the request
  async synthesizeWithRetry(options: TtsOptions, maxRetries = 1): Promise<TtsResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.synthesize(options);
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError && error.status === 403 && attempt < maxRetries) {
          // Signed URL expired, retry once
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}

export const ttsService = new TtsService();