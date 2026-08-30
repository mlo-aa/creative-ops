/** Voiceover script safety — brief/script separation and claim checks. */

export type VoiceoverValidationIssue = {
  kind: "instruction_leak" | "unsupported_claim";
  message: string;
  match?: string;
};

export type VoiceoverValidationResult = {
  ok: boolean;
  issues: VoiceoverValidationIssue[];
};

const INSTRUCTION_LEAK_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /\bcreate a (short )?(instagram|tiktok|linkedin|youtube|reel|video)\b/i, message: "Sounds like a creative brief instruction" },
  { pattern: /\bthe reel should\b/i, message: "Sounds like a brief instruction (\"the reel should…\")" },
  { pattern: /\bthe brief\b/i, message: "References the brief instead of narration" },
  { pattern: /\bplatform\s*:/i, message: "Contains brief metadata (Platform:)" },
  { pattern: /\bduration\s*:/i, message: "Contains brief metadata (Duration:)" },
  { pattern: /\bstyle\s*:/i, message: "Contains brief metadata (Style:)" },
  { pattern: /\bkeep it (modern|energetic|product-focused|short|simple)\b/i, message: "Sounds like a style instruction from the brief" },
  { pattern: /\bavoid invented\b/i, message: "Sounds like a brief constraint, not narration" },
  { pattern: /\bend with a (simple )?invitation\b/i, message: "Sounds like a brief direction, not spoken copy" },
  { pattern: /\bproblem-solution story\b/i, message: "Sounds like brief structure guidance" },
  { pattern: /\bintroducing .+ as a global marketplace\b/i, message: "Copies brief setup language into narration" },
  { pattern: /\bthis reel (will|should|must)\b/i, message: "Sounds like production instruction" },
  { pattern: /\bcommunicate a (simple )?problem/i, message: "Sounds like brief instruction (\"communicate a problem…\")" },
];

const UNSUPPORTED_CLAIM_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /\bjoin thousands\b/i, message: "Unsupported adoption claim (\"join thousands\")" },
  { pattern: /\bthousands (who|of (users|customers|clients|businesses|freelancers))\b/i, message: "Unsupported user/customer count" },
  { pattern: /\bmillions\b/i, message: "Unsupported scale claim" },
  { pattern: /\btrusted by (thousands|millions|\d)/i, message: "Unsupported trust claim with numbers" },
  { pattern: /\b\d[\d,]*\+?\s*(users|customers|clients|businesses|freelancers|companies)\b/i, message: "Unsupported quantitative user claim" },
  { pattern: /\bmarket leader\b/i, message: "Unsupported market leadership claim" },
  { pattern: /\b#\d+\b/i, message: "Unsupported ranking claim" },
  { pattern: /\bguarantee(d|s)?\b/i, message: "Unsupported guarantee claim" },
  { pattern: /\b\d+(\.\d+)?%\b/i, message: "Unsupported performance metric" },
  { pattern: /\btestimonial\b/i, message: "Unsupported testimonial reference" },
  { pattern: /\b(as seen in|featured in)\b/i, message: "Unsupported media/social proof claim" },
];

export function findInstructionLeaks(script: string): VoiceoverValidationIssue[] {
  const issues: VoiceoverValidationIssue[] = [];
  for (const { pattern, message } of INSTRUCTION_LEAK_PATTERNS) {
    const match = script.match(pattern);
    if (match) {
      issues.push({ kind: "instruction_leak", message, match: match[0] });
    }
  }
  return issues;
}

export function findUnsupportedClaims(script: string): VoiceoverValidationIssue[] {
  const issues: VoiceoverValidationIssue[] = [];
  for (const { pattern, message } of UNSUPPORTED_CLAIM_PATTERNS) {
    const match = script.match(pattern);
    if (match) {
      issues.push({ kind: "unsupported_claim", message, match: match[0] });
    }
  }
  return issues;
}

export function validateVoiceoverScript(script: string): VoiceoverValidationResult {
  const trimmed = script.trim();
  if (!trimmed) {
    return { ok: false, issues: [{ kind: "instruction_leak", message: "Voiceover script is empty" }] };
  }
  const issues = [...findInstructionLeaks(trimmed), ...findUnsupportedClaims(trimmed)];
  return { ok: issues.length === 0, issues };
}

export function formatVoiceoverValidationError(result: VoiceoverValidationResult): string {
  if (result.ok) return "";
  const lines = result.issues.map((i) => `• ${i.message}${i.match ? ` (“${i.match}”)` : ""}`);
  return [
    "Review the voiceover script before generating audio.",
    "The script looks like brief instructions or contains unsupported claims:",
    ...lines,
    "Edit the scene scripts or voiceover text, then try again.",
  ].join("\n");
}

/** ~12.5 characters/sec — conversational English narration estimate. */
export function estimateNarrationDurationMs(script: string, charsPerSecond = 12.5): number {
  const chars = script.trim().length;
  if (chars === 0) return 0;
  return Math.round((chars / charsPerSecond) * 1000);
}

export function narrationExceedsReel(script: string, reelDurationMs: number): boolean {
  return estimateNarrationDurationMs(script) > reelDurationMs;
}
