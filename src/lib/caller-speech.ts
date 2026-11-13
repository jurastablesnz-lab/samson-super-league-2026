import type { CallClip } from "./arena-caller.ts";
import { spokenLine } from "./spoken-line.ts";

/** What Test sound says. Cached like every other line. */
export const TEST_SOUND_TEXT = "Hello Susan, testing";

/** xAI lists TTS at about $15 per million characters. */
export const TTS_USD_PER_MILLION_CHARS = 15;

/** Words for the voice, and the cache key. The same shorthand always becomes the same line. */
export function speechText(text: string): string {
  return spokenLine(text).slice(0, 500);
}

export function instructionText(movement: { steps: { at?: string; do?: string }[] }): string {
  return speechText(
    movement.steps
      .map((step) => [step.at, step.do].filter(Boolean).join(" "))
      .filter(Boolean)
      .join(". "),
  );
}

/**
 * Every line the caller can say: the test phrase, each movement, each personal cue,
 * and each directive. Directives are prepared even while the toggle is off, so turning
 * them on does not switch to the phone voice mid-ride.
 */
export function callerSpeechLines(
  movements: { n: number; steps: { at?: string; do?: string }[]; directive?: string }[],
  cues: { n: number; text?: string; spoken?: string }[],
): string[] {
  const lines = [TEST_SOUND_TEXT];
  for (const movement of movements) {
    const cue = cues.find((item) => item.n === movement.n);
    const instruction = speechText(cue?.spoken?.trim() || instructionText(movement));
    if (instruction) lines.push(instruction);
    const personal = speechText(cue?.text ?? "");
    if (personal) lines.push(personal);
    const directive = speechText(movement.directive ?? "");
    if (directive) lines.push(directive);
  }
  return [...new Set(lines)];
}

export function ttsCostUsd(chars: number): number {
  return (Math.max(0, chars) / 1_000_000) * TTS_USD_PER_MILLION_CHARS;
}

export async function speechHash(voice: string, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${voice.trim().toLowerCase()}\n${speechText(text)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A file already on the movement wins. Otherwise the cached line for this exact text. */
export function resolveClipUrl(clip: CallClip, urls: Record<string, string>): string | undefined {
  if (clip.audioUrl) return clip.audioUrl;
  return urls[speechText(clip.text)];
}
