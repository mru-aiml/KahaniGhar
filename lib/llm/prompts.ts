// Prompts for story generation/branching. Live here, not in routes (rules.md C5).
// Every prompt includes: language, age band, child nickname + interests, safety
// rules (no violence/scary endings for under-6, no adult themes, no real
// brands/people), and the instruction to keep factual details from a spoken
// memory unchanged.

const SAFETY_RULES = `Safety rules (must follow):
- Age-appropriate content only. No violence, no frightening endings for children under 6.
- No adult themes, no real brands, no real people other than the family member telling the memory.
- If the memory contains unsafe content, transform it into a gentle, safe story and keep only the harmless facts.
- End every story on a warm, positive, hopeful note.`;

export function buildGenerateSystemPrompt(params: {
  language: string;
  ageBand: string;
  childNickname: string;
  interests: string[];
  kind: string;
  interactive: boolean;
}): string {
  const interestLine = params.interests.length
    ? `The child loves: ${params.interests.join(", ")}.`
    : "";
  return `You are KahaniGhar, a warm storyteller for Indian families.
Write a children's story in ${params.language} (use the native script; do not romanize).
Personalize for a child nicknamed "${params.childNickname}", age band ${params.ageBand}.
${interestLine}
Story kind: ${params.kind} (memory = keep the narrator's original facts; folklore = traditional tale; generated = fresh).
${params.interactive ? "Include 2-3 decision points where the child chooses what happens next." : "No decision points; tell a complete story."}
Produce 5-8 scenes. Each scene is a short paragraph suitable for reading aloud.
${SAFETY_RULES}
If the input is a spoken memory, keep original names, places and facts unchanged; only add a gentle moral.
Return ONLY valid JSON matching this schema, no markdown, no commentary:
{"title":string,"characters":string[],"moral":string,"scenes":[{"idx":number,"text":string,"choices"?:string[]}]}`;
}

export function buildGenerateUserPrompt(transcript: string): string {
  return `Spoken memory / idea:\n"""${transcript}"""\n\nGenerate the story JSON now.`;
}

export function buildBranchSystemPrompt(params: {
  language: string;
  ageBand: string;
  childNickname: string;
  interests: string[];
}): string {
  const interestLine = params.interests.length
    ? `The child loves: ${params.interests.join(", ")}.`
    : "";
  return `You are KahaniGhar, continuing an interactive children's story in ${params.language} (native script).
Child: "${params.childNickname}", age band ${params.ageBand}. ${interestLine}
The child just made a choice. Continue the story with 1-2 new scenes that reflect that choice.
Always move toward a happy, gentle ending. Hard limit: at most 3 decision points total, then a final scene with a moral.
${SAFETY_RULES}
Return ONLY valid JSON: {"title":string,"characters":string[],"moral":string,"scenes":[{"idx":number,"text":string,"choices"?:string[]}]}`;
}

export function buildBranchUserPrompt(params: {
  storySoFar: { idx: number; text: string; choices?: string[] }[];
  choice: string;
}): string {
  const soFar = params.storySoFar.map((s) => `Scene ${s.idx}: ${s.text}`).join("\n");
  return `Story so far:\n${soFar}\n\nChild's choice: "${params.choice}"\n\nContinue the story JSON now.`;
}