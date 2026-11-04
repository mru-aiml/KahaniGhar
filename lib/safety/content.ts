// Simple content-safety check on generated story output (rules.md B7).
// Rejects stories containing banned themes for children.

const BANNED_PATTERNS: RegExp[] = [
  /\b(kill|murder|blood|weapon|gun|knife)\b/i,
  /\b(sex|nude|porn|drunk|alcohol|drug)\b/i,
  /\b(suicide|self[- ]harm)\b/i,
  /\b(hate|racist|slur)\b/i,
];

export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

export function checkStorySafety(text: string): SafetyResult {
  for (const re of BANNED_PATTERNS) {
    if (re.test(text)) {
      return { safe: false, reason: `Banned theme detected (${re.source})` };
    }
  }
  return { safe: true };
}

export function checkStoryStructureSafety(structure: { title: string; moral: string; scenes: { text: string }[] }): SafetyResult {
  const combined = [structure.title, structure.moral, ...structure.scenes.map((s) => s.text)].join("\n");
  return checkStorySafety(combined);
}