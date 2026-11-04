// Phase 0 verification script: real Gnani STT + TTS calls.
// Usage:
//   GNANI_API_KEY=xxx AUDIO_PATH=/path/to/clip.wav node scripts/test-gnani.mjs
// Optional: GNANI_BASE_URL, GNANI_STT_MODEL, GNANI_TTS_MODEL, GNANI_STT_LANGUAGE
// This script makes REAL API calls and consumes credits.

import fs from "node:fs";

const API_KEY = process.env.GNANI_API_KEY;
const BASE = process.env.GNANI_BASE_URL || "https://api.vachana.ai";
const STT_MODEL = process.env.GNANI_STT_MODEL || "prisma-v2.5";
const TTS_MODEL = process.env.GNANI_TTS_MODEL || "timbre-v2.5";
const STT_LANG = process.env.GNANI_STT_LANGUAGE || "hi-IN";
const AUDIO_PATH = process.env.AUDIO_PATH;

if (!API_KEY) {
  console.error("ERROR: set GNANI_API_KEY");
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
  fs.writeFileSync("tts-test.wav", buf);
  console.log("OK: wrote tts-test.wav", buf.length, "bytes");
}

async function testStt() {
  if (!AUDIO_PATH) {
    console.log("\n--- STT skipped (set AUDIO_PATH to a <=30s clip) ---");
    return;
  }
  console.log(`\n--- STT REST (${STT_MODEL}, ${STT_LANG}) ---`);
  const form = new FormData();
  const buf = fs.readFileSync(AUDIO_PATH);
  form.append("audio_file", new Blob([buf]), AUDIO_PATH.split("/").pop() || "clip.wav");
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