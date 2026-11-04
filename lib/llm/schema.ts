// Zod schemas for LLM story output (rules.md C5). Validated; retry once on
// invalid JSON; then surface a friendly error. Never trust model output.

import { z } from "zod";

export const AgeBandSchema = z.enum(["3-5", "6-8", "9-10"]);

export const StorySceneSchema = z.object({
  idx: z.number().int().nonnegative(),
  text: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(3).optional(),
});

export const StoryStructureSchema = z.object({
  title: z.string().min(1),
  characters: z.array(z.string().min(1)).min(1),
  moral: z.string().min(1),
  scenes: z.array(StorySceneSchema).min(5).max(8),
});

export type StoryStructure = z.infer<typeof StoryStructureSchema>;
export type StoryScene = z.infer<typeof StorySceneSchema>;
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const StoryGenerateRequestSchema = z.object({
  transcript: z.string().min(1),
  language: z.string().min(1),
  childNickname: z.string().min(1),
  ageBand: AgeBandSchema,
  interests: z.array(z.string()).default([]),
  kind: z.enum(["memory", "folklore", "generated"]).default("memory"),
  interactive: z.boolean().default(true),
});

export const StoryBranchRequestSchema = z.object({
  storySoFar: z.array(StorySceneSchema),
  choice: z.string().min(1),
  language: z.string().min(1),
  childNickname: z.string().min(1),
  ageBand: AgeBandSchema,
  interests: z.array(z.string()).default([]),
});

export type StoryGenerateRequest = z.infer<typeof StoryGenerateRequestSchema>;
export type StoryBranchRequest = z.infer<typeof StoryBranchRequestSchema>;