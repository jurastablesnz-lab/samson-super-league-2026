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

export type SpeechSink = {
  paused?: boolean;
  cancel: () => void;
  resume?: () => void;
  speak: (text: string) => void;
};

/**
 * Speak inside a tap. iOS only allows speechSynthesis.speak during the gesture,
 * and a standalone home-screen app often starts paused. Cancel and resume must
 * not throw out of the click handler.
 */
export function primeCallerSpeech(synth: SpeechSink | null | undefined, texts: string[]): "ok" | "unavailable" | "blocked" {
  if (!synth || typeof synth.speak !== "function") return "unavailable";
  try {
    synth.cancel();
  } catch {
    // iOS can throw if nothing is speaking.
  }
  try {
    synth.resume?.();
  } catch {
    // Standalone Safari sometimes rejects resume. Speaking can still work.
  }
  try {
    for (const text of texts) {
      if (text.trim()) synth.speak(text);
    }
    return "ok";
  } catch {
    return "blocked";
  }
}

export const SPEECH_SILENT_HINT = "Check your phone isn't on silent.";

export function speechStatusMessage(outcome: "ok" | "unavailable" | "blocked"): string | null {
  if (outcome === "unavailable") return `Speech isn't available in this browser. ${SPEECH_SILENT_HINT}`;
  if (outcome === "blocked") return `Speech is blocked. ${SPEECH_SILENT_HINT}`;
  return null;
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
