// Thin client for Gnani Timbre TTS (REST). Server-side only.
// Docs: POST /api/v1/tts/inference returns raw binary audio.
// Model name comes from config (default timbre-v2.5).

import { config, gnaniHeaders, requireServerSecret } from "@/lib/config";

export interface TtsAudioConfig {
  sample_rate?: number;
  num_channels?: number;
  sample_width?: number;
  encoding?: string;
  container?: "wav" | "mp3" | "ogg" | "raw" | "mulaw" | "alaw";
  bitrate?: string;
}

export interface SynthesizeOptions {
  text: string;
  voice: string;
  language?: string;
  model?: string;
  speed?: number | string;
  audioConfig?: TtsAudioConfig;
}

export interface GnaniError {
  code: string;
  message: string;
  retryable: boolean;
  status: number;
}

export class GnaniRequestError extends Error {
  code: string;
  retryable: boolean;
  status: number;
  constructor(e: GnaniError) {
    super(e.message);
    this.name = "GnaniRequestError";
    this.code = e.code;
    this.retryable = e.retryable;
    this.status = e.status;
  }
}

const TTS_TIMEOUT_MS = 60_000;

const DEFAULT_AUDIO_CONFIG: TtsAudioConfig = {
  sample_rate: 44100,
  num_channels: 1,
  sample_width: 2,
  encoding: "linear_pcm",
  container: "wav",
};

export async function synthesize(options: SynthesizeOptions): Promise<ArrayBuffer> {
  requireServerSecret("GNANI_API_KEY", config.gnani.apiKey);

  const model = options.model ?? config.gnani.ttsModel;
  const language = options.language ?? "hi-IN";
  const audioConfig = { ...DEFAULT_AUDIO_CONFIG, ...(options.audioConfig ?? {}) };

  const body = {
    text: options.text,
    voice: options.voice,
    model,
    language,
    speed: options.speed ?? 1.0,
    audio_config: audioConfig,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.gnani.baseUrl}/api/v1/tts/inference`, {
      method: "POST",
      headers: { ...gnaniHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 402) {
      let code = "HTTP_" + res.status;
      let message = `Gnani TTS request failed (${res.status})`;
      try {
        const j = (await res.json()) as { detail?: { error_code?: string; message?: string } };
        if (j?.detail?.error_code) code = j.detail.error_code;
        if (j?.detail?.message) message = j.detail.message;
      } catch {
        /* ignore */
      }
      throw new GnaniRequestError({ code, message, retryable: res.status === 429, status: res.status });
    }

    if (!res.ok) {
      let message = `Gnani TTS failed (${res.status})`;
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) message = j.message;
      } catch {
        /* ignore */
      }
      throw new GnaniRequestError({
        code: "TTS_ERROR",
        message,
        retryable: res.status >= 500,
        status: res.status,
      });
    }

    return await res.arrayBuffer();
  } catch (e) {
    if (e instanceof GnaniRequestError) throw e;
    if ((e as Error)?.name === "AbortError") {
      throw new GnaniRequestError({ code: "TIMEOUT", message: "Gnani TTS request timed out", retryable: true, status: 0 });
    }
    throw new GnaniRequestError({
      code: "NETWORK_ERROR",
      message: (e as Error)?.message ?? "Network error calling Gnani TTS",
      retryable: true,
      status: 0,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Stable cache key for a scene narration. Used to avoid regenerating audio.
export function ttsCacheKey(params: {
  sceneId: string;
  voice: string;
  language: string;
  model: string;
}): string {
  return `tts/${params.model}/${params.language}/${params.voice}/${params.sceneId}.wav`;
}