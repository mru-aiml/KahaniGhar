// Phase 0 verification script: real Gnani STT + TTS calls.
// Usage (PowerShell):
//   $env:GNANI_API_KEY="your-key"; $env:AUDIO_PATH="C:\path\to\clip.wav"; node scripts/test-gnani.mjs
// Or fill .env.local and run: node scripts/test-gnani.mjs  (auto-loads .env.local)
// Optional env: GNANI_BASE_URL, GNANI_STT_MODEL, GNANI_TTS_MODEL, GNANI_STT_LANGUAGE
// This script makes REAL API calls and consumes credits.

import fs from "node:fs";
import path from "node:path";

// Auto-load .env.local if present (simple KEY=VALUE, no quotes handling beyond trim).
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

const API_KEY = process.env.GNANI_API_KEY;
const BASE = process.env.GNANI_BASE_URL || "https://api.vachana.ai";
const STT_MODEL = process.env.GNANI_STT_MODEL || "prisma-v2.5";
const TTS_MODEL = process.env.GNANI_TTS_MODEL || "timbre-v2.5";
const STT_LANG = process.env.GNANI_STT_LANGUAGE || "hi-IN";
const AUDIO_PATH = process.env.AUDIO_PATH;

if (!API_KEY) {
  console.error("ERROR: set GNANI_API_KEY (or put it in .env.local)");
  process.exit(1);
}

async function testTts() {
  console.log(`\n--- TTS REST (${TTS_MODEL}) ---`);
  const res = await fetch(`${BASE}/api/v1/tts/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": API_KEY },
    body: JSON.stringify({
      text: "नमस्ते, आप कैसे हैं?",
      voice: "Nalini",
      model: TTS_MODEL,
      language: "hi-IN",
      speed: 1.0,
      audio_config: { sample_rate: 44100, num_channels: 1, sample_width: 2, encoding: "linear_pcm", container: "wav" },
    }),
  });
  console.log("status:", res.status, res.statusText);
  if (!res.ok) {
    console.log("body:", await res.text());
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(process.cwd(), "tts-test.wav");
  fs.writeFileSync(out, buf);
  console.log("OK: wrote", out, buf.length, "bytes");
}

async function testStt() {
  if (!AUDIO_PATH) {
    console.log("\n--- STT skipped (set AUDIO_PATH to a <=30s clip) ---");
    return;
  }
  console.log(`\n--- STT REST (${STT_MODEL}, ${STT_LANG}) ---`);
  const form = new FormData();
  const buf = fs.readFileSync(AUDIO_PATH);
  const filename = path.basename(AUDIO_PATH);
  form.append("audio_file", new Blob([buf]), filename);
  if (STT_MODEL) form.append("model", STT_MODEL);
  form.append("language_code", STT_LANG);
  const res = await fetch(`${BASE}/stt/v3`, {
    method: "POST",
    headers: { "X-API-Key-ID": API_KEY },
    body: form,
  });
  console.log("status:", res.status, res.statusText);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

await testTts();
await testStt();
console.log("\nDone. Verify tts-test.wav plays and the transcript looks right.");
console.log("Languages to verify for the demo: hi-IN, en-IN, hi-en (Hinglish), mr-IN (Marathi).");