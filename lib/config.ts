// Centralized configuration. Model names, voice ids, URLs and API config come
// from environment variables only (rules.md C3). No hardcoded model strings
// elsewhere. Server-only secrets must never be imported into client code.

export const config = {
  gnani: {
    apiKey: process.env.GNANI_API_KEY ?? "",
    baseUrl: process.env.GNANI_BASE_URL ?? "https://api.vachana.ai",
    sttModel: process.env.GNANI_STT_MODEL ?? "prisma-v2.5",
    ttsModel: process.env.GNANI_TTS_MODEL ?? "timbre-v2.5",
    vcModel: process.env.GNANI_VC_MODEL ?? "vachana-vc-v1",
    sttLanguage: process.env.GNANI_STT_LANGUAGE ?? "hi-IN",
  },
  llm: {
    url: process.env.LLM_URL ?? "",
    key: process.env.LLM_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gnani-evon-v3.3",
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    rateLimitPerIpPerMin: Number(process.env.RATE_LIMIT_PER_IP_PER_MIN ?? "10"),
  },
} as const;

export function requireServerSecret(name: string, value: string): void {
  if (!value) {
    throw new Error(`Missing required server secret: ${name}`);
  }
}

export function gnaniHeaders(): HeadersInit {
  requireServerSecret("GNANI_API_KEY", config.gnani.apiKey);
  return { "X-API-Key-ID": config.gnani.apiKey };
}

// Challenge-required model identifiers (named in the submission).
export const GNANI_MODELS = {
  stt: "Gnani Prisma v2.5",
  tts: "Gnani Timbre v2.5",
  llm: "Gnani Evon v3.3",
} as const;