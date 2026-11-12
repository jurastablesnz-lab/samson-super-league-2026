import type { Movement } from "./tests/types.ts";

/** One thing the caller plays. A file, when present, replaces spoken text. */
export type CallClip = { text: string; audioUrl?: string };

export function movementCall(
  movement: Movement,
  directives: boolean,
  cue?: { text?: string; audioUrl?: string } | null,
): CallClip[] {
  const instruction = movement.steps
    .map((step) => [step.at, step.do].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(". ");
  const clips: CallClip[] = [];
  if (instruction) clips.push({ text: instruction, audioUrl: movement.audioUrl });
  const personal = cue?.text?.trim() ?? "";
  if (personal) clips.push({ text: personal, audioUrl: cue?.audioUrl });
  const directive = movement.directive.trim();
  if (directives && directive) clips.push({ text: directive });
  return clips;
}

/** Higher is a better browser voice for a New Zealand rider. */
export function voiceScore(voice: { lang: string; name: string }): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;
  if (lang.startsWith("en-nz")) score += 100;
  else if (lang.startsWith("en-gb")) score += 80;
  else if (lang.startsWith("en-au")) score += 70;
  else if (lang.startsWith("en")) score += 40;
  if (/natural|premium|enhanced|samantha|karen|moira|serena|google uk english female/.test(name)) {
    score += 30;
  }
  if (/compact|espeak|android/.test(name)) score -= 15;
  return score;
}

/** True when the rider said the word "next", even inside a short phrase. */
export function hearsNext(transcript: string): boolean {
  return /\bnext\b/i.test(transcript);
}

export function clampGap(seconds: number): number {
  if (!Number.isFinite(seconds)) return 8;
  return Math.min(60, Math.max(2, Math.round(seconds)));
}
