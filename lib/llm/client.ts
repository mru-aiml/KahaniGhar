// LLM client. Plan A: OpenAI-compatible endpoint (LLM_URL) serving Gnani
// Evon v3.3. Plan B: organiser-approved alternative behind the same interface.
// Swapping is a one-file change (rules.md architecture §8).

import { config, requireServerSecret } from "@/lib/config";
import { StoryStructureSchema, type StoryStructure } from "@/lib/llm/schema";
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  buildBranchSystemPrompt,
  buildBranchUserPrompt,
} from "@/lib/llm/prompts";
import type { StoryGenerateRequest, StoryBranchRequest } from "@/lib/llm/schema";

export interface LLMProvider {
  chat(system: string, user: string): Promise<string>;
}

export class HttpOpenAIProvider implements LLMProvider {
  async chat(system: string, user: string): Promise<string> {
    requireServerSecret("LLM_URL", config.llm.url);
    const res = await fetch(`${config.llm.url.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.llm.key ? { Authorization: `Bearer ${config.llm.key}` } : {}),
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM request failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    return content;
  }
}

// Default provider. Replace this binding to switch to Plan B (organiser-approved).
let provider: LLMProvider = new HttpOpenAIProvider();

export function setLLMProvider(p: LLMProvider): void {
  provider = p;
}

export function getLLMProvider(): LLMProvider {
  return provider;
}

async function parseStory(raw: string): Promise<StoryStructure> {
  // Strip code fences if present.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  return StoryStructureSchema.parse(parsed);
}

export async function generateStory(req: StoryGenerateRequest): Promise<StoryStructure> {
  const system = buildGenerateSystemPrompt({
    language: req.language,
    ageBand: req.ageBand,
    childNickname: req.childNickname,
    interests: req.interests,
    kind: req.kind,
    interactive: req.interactive,
  });
  const user = buildGenerateUserPrompt(req.transcript);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await provider.chat(system, user);
      return await parseStory(raw);
    } catch (e) {
      lastError = e;
      if (attempt === 0) {
        // Retry once on invalid JSON / schema failure.
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Story generation failed");
}

export async function branchStory(req: StoryBranchRequest): Promise<StoryStructure> {
  const system = buildBranchSystemPrompt({
    language: req.language,
    ageBand: req.ageBand,
    childNickname: req.childNickname,
    interests: req.interests,
  });
  const user = buildBranchUserPrompt({ storySoFar: req.storySoFar, choice: req.choice });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await provider.chat(system, user);
      return await parseStory(raw);
    } catch (e) {
      lastError = e;
      if (attempt === 0) continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Story branching failed");
}