/** Shared rules for beta feedback. No secrets, no network, safe in the browser. */

export const FEEDBACK_KINDS = ["bug", "idea", "general"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Something's not working",
  idea: "Idea",
  general: "General",
};

/** Voice notes stop on their own after this long. */
export const MAX_VOICE_SECONDS = 120;
/**
 * Two minutes of phone audio is well under 2 MB at the bitrate we ask for. The
 * cap leaves room for a browser that ignores the bitrate, and stays under the
 * 4.5 MB request limit on the host.
 */
export const MAX_VOICE_BYTES = 4 * 1024 * 1024;
/** Asked of MediaRecorder. Speech stays clear and a note stays small. */
export const VOICE_BITS_PER_SECOND = 64_000;
export const MAX_MESSAGE_CHARS = 4000;

/**
 * In order of preference. iPhone Safari and the home-screen app only record
 * MP4/AAC. Chrome and Firefox record WebM/Opus (newer Chrome also does MP4).
 * MP4 first so Susan can play the note on her own iPhone.
 */
export const VOICE_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/aac",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function pickVoiceMime(isTypeSupported: (type: string) => boolean): string {
  for (const type of VOICE_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(type)) return type;
    } catch {
      // Some browsers throw for a type they do not know.
    }
  }
  return "";
}

/** "audio/mp4;codecs=mp4a.40.2" → "audio/mp4". Anything that is not audio → "". */
export function baseAudioMime(mime: string): string {
  const base = String(mime ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (base === "audio/x-m4a" || base === "audio/m4a") return "audio/mp4";
  // Safari has labelled audio-only recordings as video/mp4.
  if (base === "video/mp4") return "audio/mp4";
  if (base === "video/webm") return "audio/webm";
  return /^audio\/[a-z0-9.+-]+$/.test(base) ? base : "";
}

const EXT: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

export function voiceExtension(mime: string): string {
  return EXT[baseAudioMime(mime)] ?? "";
}

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === "string" && (FEEDBACK_KINDS as readonly string[]).includes(value);
}

const clip = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.split(String.fromCharCode(0)).join("").trim().slice(0, max)
    : "";

export type FeedbackDraft = {
  kind: FeedbackKind;
  message: string;
  page: string;
  appVersion: string;
  userAgent: string;
  audioMs: number;
};

/** Cleans what the browser sent. Throws a rider-friendly message when it is empty. */
export function cleanFeedback(
  input: {
    kind?: unknown;
    message?: unknown;
    page?: unknown;
    appVersion?: unknown;
    userAgent?: unknown;
    audioMs?: unknown;
  },
  hasAudio: boolean,
): FeedbackDraft {
  const message = clip(input.message, MAX_MESSAGE_CHARS);
  if (!message && !hasAudio) throw new Error("Type a message or record a voice note first.");
  const ms = Math.round(Number(input.audioMs));
  return {
    kind: isFeedbackKind(input.kind) ? input.kind : "general",
    message,
    page: clip(input.page, 300),
    appVersion: clip(input.appVersion, 80),
    userAgent: clip(input.userAgent, 400),
    audioMs:
      hasAudio && Number.isFinite(ms)
        ? Math.min(Math.max(ms, 0), (MAX_VOICE_SECONDS + 5) * 1000)
        : 0,
  };
}

/** "1:05" for 65 000 ms. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** A short, readable device name for the admin list, from a user agent. */
export function deviceLabel(userAgent: string): string {
  const ua = String(userAgent ?? "");
  const standalone = /\(home-screen app\)/.test(ua) ? " · home-screen app" : "";
  let device = "Unknown device";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) device = "iPad";
  else if (/Android/.test(ua)) device = "Android";
  else if (/Macintosh/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Linux|CrOS/.test(ua)) device = "Linux";
  const ios = /OS (\d+)[_.](\d+)/.exec(ua);
  const version =
    (device === "iPhone" || device === "iPad") && ios ? ` (iOS ${ios[1]}.${ios[2]})` : "";
  let browser = "";
  if (/CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/FxiOS|Firefox\//.test(ua)) browser = "Firefox";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Safari\//.test(ua) || /AppleWebKit/.test(ua)) browser = "Safari";
  return `${device}${version}${browser ? ` · ${browser}` : ""}${standalone}`;
}
