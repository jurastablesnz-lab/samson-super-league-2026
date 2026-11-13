/** A short riding command. Anything else is ignored. */
export type RideCommand = "next" | "back" | "repeat";

export type MicStatus = "off" | "listening" | "permission" | "unsupported" | "paused";

export type CommandMode = "webkit" | "mic" | "none";

function words(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What the rider asked for. Short phrases only, so a long echo of the movement
 * is not treated as a command. "go back" is back, not next.
 */
export function hearCommand(transcript: string): RideCommand | null {
  const said = words(transcript);
  if (!said) return null;
  const count = said.split(" ").length;
  if (count > 6) return null;
  if (/\b(repeat|again)\b/.test(said)) return "repeat";
  if (/\b(back|previous)\b/.test(said)) return "back";
  if (/\bnext\b/.test(said)) return "next";
  if (/^(go|go on|continue)$/.test(said)) return "next";
  return null;
}

/** Ignore a transcript while Ara is speaking, or when it is too long to be a command. */
export function commandFromTranscript(transcript: string, speaking: boolean): RideCommand | null {
  if (speaking) return null;
  return hearCommand(transcript);
}

/**
 * iPhone Safari can recognise speech, but a home-screen app cannot, and playing
 * an audio clip stops recognition afterwards. The microphone plus a short
 * transcription works in both places. Other browsers keep the free recogniser.
 */
export function commandMode(input: { ios: boolean; hasRecognition: boolean; hasMic: boolean }): CommandMode {
  if (input.ios && input.hasMic) return "mic";
  if (input.hasRecognition) return "webkit";
  if (input.hasMic) return "mic";
  return "none";
}

export function callerDevice(input: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayStandalone?: boolean;
}): { ios: boolean; standalone: boolean } {
  const ua = input.userAgent ?? "";
  const ios =
    /iPad|iPhone|iPod/.test(ua) || (input.platform === "MacIntel" && (input.maxTouchPoints ?? 0) > 1);
  return { ios, standalone: !!(input.standalone || input.displayStandalone) };
}

export function micHelp(input: { status: MicStatus; mode: CommandMode; standalone: boolean }): string {
  if (input.status === "listening") return "Listening. Say next, back, or repeat.";
  if (input.status === "paused") return "Voice commands are paused until tomorrow. The buttons still work.";
  if (input.status === "permission") {
    if (input.mode === "webkit") {
      return "Turn on Dictation in Settings, General, Keyboard, and allow the microphone for Safari. Tap here to try again.";
    }
    return "Microphone is blocked. On iPhone open Settings, Safari, Microphone, and allow this site. Tap here to try again.";
  }
  if (input.status === "unsupported") {
    if (input.standalone) {
      return "The home-screen app cannot hear you. Open this page in Safari, or allow the microphone and tap here.";
    }
    return "This browser cannot hear commands. The buttons still work.";
  }
  return "Tap start. That also turns the microphone on.";
}

export type VadState = { hot: number; cool: number; recording: boolean; ms: number };

const START_RMS = 0.025;
const KEEP_RMS = 0.015;
const START_MS = 160;
const END_MS = 700;
const MIN_MS = 350;
const MAX_MS = 3500;

export function idleVad(): VadState {
  return { hot: 0, cool: 0, recording: false, ms: 0 };
}

/** Decide when a short command has started and finished. Suspended means Ara is speaking. */
export function stepVad(
  state: VadState,
  rms: number,
  dt: number,
  suspended: boolean,
): { next: VadState; action: "start" | "stop" | "discard" | "none" } {
  if (suspended) {
    return { next: idleVad(), action: state.recording ? "discard" : "none" };
  }
  if (!state.recording) {
    if (rms < START_RMS) return { next: idleVad(), action: "none" };
    const hot = state.hot + dt;
    if (hot < START_MS) return { next: { hot, cool: 0, recording: false, ms: 0 }, action: "none" };
    return { next: { hot: 0, cool: 0, recording: true, ms: 0 }, action: "start" };
  }
  const ms = state.ms + dt;
  if (ms >= MAX_MS) return { next: idleVad(), action: "stop" };
  if (rms >= KEEP_RMS) return { next: { hot: 0, cool: 0, recording: true, ms }, action: "none" };
  const cool = state.cool + dt;
  if (cool < END_MS) return { next: { hot: 0, cool, recording: true, ms }, action: "none" };
  return { next: idleVad(), action: ms >= MIN_MS ? "stop" : "discard" };
}
