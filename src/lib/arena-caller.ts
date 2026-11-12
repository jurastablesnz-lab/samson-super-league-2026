import type { Movement } from "./tests/types.ts";

/** One thing the caller plays. A file, when present, replaces spoken text. */
export type CallClip = { text: string; audioUrl?: string };

export function movementCall(movement: Movement, directives: boolean): CallClip[] {
  const instruction = movement.steps
    .map((step) => [step.at, step.do].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(". ");
  const clips: CallClip[] = [];
  if (instruction) clips.push({ text: instruction, audioUrl: movement.audioUrl });
  const directive = movement.directive.trim();
  if (directives && directive) clips.push({ text: directive });
  return clips;
}

/** True when the rider said the word "next", even inside a short phrase. */
export function hearsNext(transcript: string): boolean {
  return /\bnext\b/i.test(transcript);
}

export function clampGap(seconds: number): number {
  if (!Number.isFinite(seconds)) return 8;
  return Math.min(60, Math.max(2, Math.round(seconds)));
}
