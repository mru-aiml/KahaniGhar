// Thin client for Gnani voice-cloning (VC) embeddings. Server-side only.
// Optional P1 feature. Do not use until challenge eligibility/authorization
// is confirmed on Discord. Embeddings are sensitive personal data.

import { config, gnaniHeaders, requireServerSecret } from "@/lib/config";

export interface SpeakerEmbedding {
  embedding: string;
  shape: number[];
  dtype: string;
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

const VC_TIMEOUT_MS = 60_000;

export async function createEmbedding(audio: Blob | Buffer | ArrayBuffer, filename = "sample.wav"): Promise<SpeakerEmbedding> {
  requireServerSecret("GNANI_API_KEY", config.gnani.apiKey);

  const size =
    audio instanceof Blob ? audio.size : audio instanceof ArrayBuffer ? audio.byteLength : (audio as Buffer).byteLength;
  if (!size || size <= 0) {
    throw new GnaniRequestError({
      code: "EMPTY_AUDIO",
      message: "Voice sample is empty",
      retryable: false,
      status: 400,
    });
  }

  const form = new FormData();
  const blob =
    audio instanceof Blob
      ? audio
      : new Blob([audio as BlobPart], { type: "audio/wav" });
  form.append("audio_file", blob, filename);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VC_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.gnani.baseUrl}/api/v1/tts/voice-clone/embeddings`, {
      method: "POST",
      headers: gnaniHeaders(),
      body: form,
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 402) {
      let code = "HTTP_" + res.status;
      let message = `Gnani VC request failed (${res.status})`;
      try {
        const j = (await res.json()) as { detail?: { error_code?: string; message?: string } };
        if (j?.detail?.error_code) code = j.detail.error_code;
        if (j?.detail?.message) message = j.detail.message;
      } catch {
        /* ignore */
      }
      throw new GnaniRequestError({ code, message, retryable: res.status === 429, status: res.status });
    }

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new GnaniRequestError({
        code: "VC_ERROR",
        message: String(json.message ?? `Gnani VC failed (${res.status})`),
        retryable: res.status >= 500,
        status: res.status,
      });
    }

    return {
      embedding: String(json.embedding ?? ""),
      shape: Array.isArray(json.shape) ? (json.shape as number[]) : [1, 768],
      dtype: String(json.dtype ?? "torch.bfloat16"),
    };
  } catch (e) {
    if (e instanceof GnaniRequestError) throw e;
    if ((e as Error)?.name === "AbortError") {
      throw new GnaniRequestError({ code: "TIMEOUT", message: "Gnani VC request timed out", retryable: true, status: 0 });
    }
    throw new GnaniRequestError({
      code: "NETWORK_ERROR",
      message: (e as Error)?.message ?? "Network error calling Gnani VC",
      retryable: true,
      status: 0,
    });
  } finally {
    clearTimeout(timer);
  }
}