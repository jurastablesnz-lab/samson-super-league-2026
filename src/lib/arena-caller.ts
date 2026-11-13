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
  cancel?: () => void;
  pause?: () => void;
  resume?: () => void;
  speak: (text: string) => void;
};

/**
 * Stop anything already speaking. Call this on pointerdown, never in the same
 * turn as speak(). iOS drops an utterance when cancel() and speak() run together.
 */
export function interruptCallerSpeech(
  synth: { cancel?: () => void; speaking?: boolean; pending?: boolean } | null | undefined,
) {
  try {
    if (!synth) return;
    if (synth.speaking === false && synth.pending === false) return;
    synth.cancel?.();
  } catch {
    // Nothing was speaking, or this iOS build throws on an idle cancel.
  }
}

/**
 * Speak inside the click. This never calls cancel(). Resume first: a home-screen
 * app often starts paused, and the paused flag is not reliable.
 */
export function primeCallerSpeech(synth: SpeechSink | null | undefined, texts: string[]): "ok" | "unavailable" | "blocked" {
  if (!synth || typeof synth.speak !== "function") return "unavailable";
  try {
    synth.resume?.();
  } catch {
    // Standalone Safari sometimes rejects resume. Speaking can still work.
  }
  try {
    for (const text of texts) {
      if (text.trim()) synth.speak(text);
    }
    // A home-screen app can pause the queue as speak() returns. Resume again,
    // still inside the tap. Do not cancel here.
    try {
      synth.resume?.();
    } catch {
      // resume is optional.
    }
    return "ok";
  } catch {
    return "blocked";
  }
}

/** A voice to assign, or null to leave the utterance on the system default. */
export function chooseVoice<T extends { lang: string; name: string }>(voices: T[]): T | null {
  if (!voices.length) return null;
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
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
