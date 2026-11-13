import type { Sql } from "./db.ts";
import { claimSttSeconds, clipSeconds, coachSttSecondsPerDay, releaseSttSeconds, transcriptFromStt } from "./caller-stt.ts";
import { aucklandDay, sheetReadGate } from "./sheet-reads.ts";

const MAX_BYTES = 400_000;

function fileName(mime: string): string {
  if (mime.includes("wav")) return "clip.wav";
  if (mime.includes("webm")) return "clip.webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "clip.mp3";
  return "clip.m4a";
}

export async function transcribeClip(
  apiKey: string,
  bytes: Uint8Array,
  mime: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const form = new FormData();
  form.append("model", "grok-voice-transcribe-2.0");
  form.append("file", new Blob([copy], { type: mime || "audio/mp4" }), fileName(mime));
  const res = await fetchImpl("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) return "";
  return transcriptFromStt(await res.json());
}

export async function hearClip(
  sql: Sql,
  actor: { userId: string; isAdmin: boolean; approved: boolean },
  input: { audioBase64: string; mime: string; seconds: number },
  env: { apiKey?: string; secondsPerDay?: string; day?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const gate = sheetReadGate(actor);
  if (!gate.ok) return gate;
  const apiKey = env.apiKey?.trim() ?? "";
  if (!apiKey) return { ok: false, error: "Voice commands are not available right now." };
  const mime = input.mime.trim().toLowerCase();
  if (!/^audio\/(mp4|m4a|aac|webm|wav|mpeg|mp3)$/.test(mime)) {
    return { ok: false, error: "That recording could not be read." };
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(input.audioBase64, "base64"));
  } catch {
    return { ok: false, error: "That recording could not be read." };
  }
  if (bytes.byteLength < 400 || bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: "That recording could not be read." };
  }
  const seconds = clipSeconds(input.seconds);
  const day = env.day ?? aucklandDay();
  const limit = coachSttSecondsPerDay(env.secondsPerDay);
  if (gate.limited) {
    const claim = await claimSttSeconds(sql, { userId: actor.userId, limit, day, seconds });
    if (!claim.ok) return claim;
  }
  try {
    const text = await transcribeClip(apiKey, bytes, mime, fetchImpl);
    return { ok: true, text };
  } catch {
    if (gate.limited) await releaseSttSeconds(sql, { userId: actor.userId, day, seconds });
    return { ok: false, error: "That word could not be heard. The buttons still work." };
  }
}
