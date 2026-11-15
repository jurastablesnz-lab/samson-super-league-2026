import type { Sql } from "./db.ts";

/** Ten minutes. At $0.10 per hour that is about two cents a day. */
export const DEFAULT_STT_SECONDS_PER_DAY = 600;

export function coachSttSecondsPerDay(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isInteger(value) || value < 1) return DEFAULT_STT_SECONDS_PER_DAY;
  return value;
}

export function sttLimitMessage(limit: number): string {
  const minutes = Math.max(1, Math.round(limit / 60));
  return `You've used today's ${minutes} minutes of voice commands. The buttons still work, and you can say more tomorrow.`;
}

/** iOS reports audio/mp4;codecs=mp4a.40.2. The service wants the base type. */
export function bareAudioMime(raw: string): string {
  const base = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    base === "audio/mp4" ||
    base === "audio/m4a" ||
    base === "audio/x-m4a" ||
    base === "audio/aac"
  )
    return "audio/mp4";
  if (base === "audio/webm") return "audio/webm";
  if (base === "audio/mpeg" || base === "audio/mp3") return "audio/mpeg";
  if (base === "audio/wav" || base === "audio/wave" || base === "audio/x-wav") return "audio/wav";
  return "";
}

/** Recent microphone samples, plus the clip once a command starts. */
export type PcmRing = { chunks: Float32Array[]; samples: number; capture: Float32Array[] | null };

export function createPcmRing(): PcmRing {
  return { chunks: [], samples: 0, capture: null };
}

/** Keep about 0.4s, and copy new samples into the open clip. */
export function pushPcm(ring: PcmRing, frame: Float32Array, sampleRate: number): void {
  const copy = new Float32Array(frame);
  ring.chunks.push(copy);
  ring.samples += copy.length;
  const max = Math.floor(sampleRate * 0.4);
  while (ring.samples > max && ring.chunks.length > 1) {
    ring.samples -= ring.chunks[0].length;
    ring.chunks.shift();
  }
  if (ring.capture) ring.capture.push(copy);
}

/** The clip starts with the audio already in the ring, so the first syllable is kept. */
export function beginPcm(ring: PcmRing): void {
  ring.capture = ring.chunks.slice();
}

export function endPcm(ring: PcmRing, discard: boolean): Float32Array | null {
  const chunks = ring.capture;
  ring.capture = null;
  if (discard || !chunks?.length) return null;
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!total) return null;
  const samples = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return samples;
}

/** 16-bit mono WAV. A short command keeps the audio from before the voice detector opened. */
export function encodeWavPcm(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export function clipSeconds(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(8, Math.max(1, Math.round(value)));
}

export async function claimSttSeconds(
  sql: Sql,
  input: { userId: string; limit: number; day: string; seconds: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const seconds = clipSeconds(input.seconds);
  const rows = await sql<{ seconds: number }>`
    insert into coach_stt_days (user_id, read_on, seconds)
    select ${input.userId}, ${input.day}::date, ${seconds}::int
    where ${seconds}::int <= ${input.limit}::int
    on conflict (user_id, read_on) do update
      set seconds = coach_stt_days.seconds + ${seconds}::int, updated_at = now()
      where coach_stt_days.seconds + ${seconds}::int <= ${input.limit}::int
    returning seconds`;
  if (!rows.length) return { ok: false, error: sttLimitMessage(input.limit) };
  return { ok: true };
}

export async function releaseSttSeconds(
  sql: Sql,
  input: { userId: string; day: string; seconds: number },
): Promise<void> {
  const seconds = clipSeconds(input.seconds);
  await sql`update coach_stt_days
    set seconds = greatest(0, seconds - ${seconds}::int), updated_at = now()
    where user_id = ${input.userId} and read_on = ${input.day}::date`;
}

export function transcriptFromStt(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const text = (body as { text?: unknown }).text;
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}
