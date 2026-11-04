// Thin client for Gnani Prisma STT (REST). Server-side only.
// Docs: POST /stt/v3, multipart/form-data, max 30s audio.
// Model name comes from config (default prisma-v2.5).

import { config, gnaniHeaders, requireServerSecret } from "@/lib/config";

export interface SttResult {
  success: true;
  requestId: string;
  transcript: string;
  model: string;
  detectedLanguageCode?: string;
  processingTime?: number;
  endToEndLatency?: number;
  truncated?: boolean;
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

const STT_TIMEOUT_MS = 60_000;
const MAX_AUDIO_DURATION_S = 30;

export interface TranscribeOptions {
  audio: Blob | Buffer | ArrayBuffer;
  filename?: string;
  mimeType?: string;
  languageCode?: string;
  model?: string;
  format?: "verbatim" | "transcribe" | "codemix" | "transliterate";
  topic?: string;
  keyterms?: string[];
}

export async function transcribe(options: TranscribeOptions): Promise<SttResult> {
  requireServerSecret("GNANI_API_KEY", config.gnani.apiKey);

  const languageCode = options.languageCode ?? config.gnani.sttLanguage;
  const model = options.model ?? config.gnani.sttModel;

  const form = new FormData();
  const blob =
    options.audio instanceof Blob
      ? options.audio
      : new Blob([options.audio as BlobPart], {
          type: options.mimeType ?? "audio/wav",
        });
  form.append("audio_file", blob, options.filename ?? "recording.wav");
  if (model) form.append("model", model);
  form.append("language_code", languageCode);
  if (options.format) form.append("format", options.format);
  if (options.topic) form.append("topic", options.topic);
  if (options.keyterms?.length) {
    form.append("keyterms", JSON.stringify(options.keyterms));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.gnani.baseUrl}/stt/v3`, {
      method: "POST",
      headers: gnaniHeaders(),
      body: form,
      signal: controller.signal,
    });

    // Auth / rate-limit errors use the {detail:{error_code,...}} shape.
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 402) {
      let code = "HTTP_" + res.status;
      let message = `Gnani STT request failed (${res.status})`;
      try {
        const j = (await res.json()) as { detail?: { error_code?: string; message?: string } };
        if (j?.detail?.error_code) code = j.detail.error_code;
        if (j?.detail?.message) message = j.detail.message;
      } catch {
        /* ignore */
      }
      throw new GnaniRequestError({
        code,
        message,
        retryable: res.status === 429 || res.status === 402,
        status: res.status,
      });
    }

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const err = (json.error as { type?: string; message?: string } | undefined) ?? {};
      throw new GnaniRequestError({
        code: err.type ?? "STT_ERROR",
        message: err.message ?? `Gnani STT failed (${res.status})`,
        retryable: res.status >= 500,
        status: res.status,
      });
    }

    return {
      success: true,
      requestId: String(json.request_id ?? ""),
      transcript: String(json.transcript ?? ""),
      model: String(json.model ?? model),
      detectedLanguageCode:
        typeof json.detected_language_code === "string"
          ? json.detected_language_code
          : undefined,
      processingTime:
        typeof json.processing_time === "number" ? json.processing_time : undefined,
      endToEndLatency:
        typeof json.end_to_end_latency === "number"
          ? json.end_to_end_latency
          : undefined,
      truncated: json.truncated === true ? true : undefined,
    };
  } catch (e) {
    if (e instanceof GnaniRequestError) throw e;
    if ((e as Error)?.name === "AbortError") {
      throw new GnaniRequestError({
        code: "TIMEOUT",
        message: "Gnani STT request timed out",
        retryable: true,
        status: 0,
      });
    }
    throw new GnaniRequestError({
      code: "NETWORK_ERROR",
      message: (e as Error)?.message ?? "Network error calling Gnani STT",
      retryable: true,
      status: 0,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const STT_LIMITS = {
  maxDurationSeconds: MAX_AUDIO_DURATION_S,
} as const;