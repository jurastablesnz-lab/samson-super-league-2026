import type { Sql } from "./db.ts";
import { speechHash, speechText } from "./caller-speech.ts";
import {
  claimTtsChars,
  coachTtsCharsPerDay,
  coachTtsMode,
  coachTtsVoice,
  releaseTtsChars,
} from "./coach-cues.ts";
import { aucklandDay, sheetReadGate } from "./sheet-reads.ts";

const BATCH = 8;
const MAX_AUDIO_BYTES = 500_000;

export type SpeechClip = { text: string; hash: string; audioBase64?: string; cached: boolean };

export type SpeechResult =
  | { ok: true; mode: "browser" | "xai"; voice: string; budget: "ok" | "spent"; clips: SpeechClip[] }
  | { ok: false; error: string };

type SpeechRow = { speech_hash: string; audio_b64: string | null; object_key: string | null };

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export async function synthesizeXai(apiKey: string, voice: string, text: string): Promise<Uint8Array | null> {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ text, voice_id: voice, language: "en" }),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
  }
  if (!res?.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 32 || bytes.byteLength > MAX_AUDIO_BYTES) return null;
  return bytes;
}

async function readCached(
  sql: Sql,
  hash: string,
  readObject?: (key: string) => Promise<Uint8Array | null>,
): Promise<string | null> {
  const rows = await sql<SpeechRow>`
    select speech_hash, audio_b64, object_key from coach_speech where speech_hash = ${hash}`;
  const row = rows[0];
  if (!row) return null;
  if (row.audio_b64) return row.audio_b64;
  if (row.object_key && readObject) {
    const bytes = await readObject(row.object_key).catch(() => null);
    if (bytes?.byteLength) return bytesToBase64(bytes);
  }
  return null;
}

/**
 * Return mp3 audio for each line. A line already stored for this voice is not
 * generated again and is not counted. Approved riders share a daily character
 * budget. Admins do not.
 */
export async function ensureCallerSpeech(
  sql: Sql,
  actor: { userId: string; isAdmin: boolean; approved: boolean },
  lines: string[],
  env: { coachTts?: string; apiKey?: string; voice?: string; charsPerDay?: string; day?: string },
  synthesize: (text: string, voice: string) => Promise<Uint8Array | null>,
  storeObject?: (hash: string, bytes: Uint8Array) => Promise<string | null>,
  readObject?: (key: string) => Promise<Uint8Array | null>,
): Promise<SpeechResult> {
  const gate = sheetReadGate(actor);
  if (!gate.ok) return gate;
  const voice = coachTtsVoice(env.voice);
  const mode = coachTtsMode(env.coachTts, env.apiKey);
  const unique = [...new Set(lines.map(speechText).filter(Boolean))].slice(0, BATCH);
  if (mode !== "xai" || !env.apiKey?.trim()) {
    return { ok: true, mode: "browser", voice, budget: "ok", clips: [] };
  }
  const clips: SpeechClip[] = [];
  const missing: { text: string; hash: string }[] = [];
  for (const text of unique) {
    const hash = await speechHash(voice, text);
    const audioBase64 = await readCached(sql, hash, readObject);
    if (audioBase64) clips.push({ text, hash, audioBase64, cached: true });
    else missing.push({ text, hash });
  }
  let budget: "ok" | "spent" = "ok";
  const day = env.day ?? aucklandDay();
  const limit = coachTtsCharsPerDay(env.charsPerDay);
  const made: { text: string; hash: string }[] = [];
  for (const line of missing) {
    if (gate.limited) {
      const claim = await claimTtsChars(sql, { userId: actor.userId, limit, day, chars: line.text.length });
      if (!claim.ok) {
        budget = "spent";
        clips.push({ text: line.text, hash: line.hash, cached: false });
        continue;
      }
    }
    made.push(line);
  }
  await Promise.all(
    made.map(async (line) => {
      const bytes = await synthesize(line.text, voice).catch(() => null);
      if (!bytes) {
        if (gate.limited) await releaseTtsChars(sql, { userId: actor.userId, day, chars: line.text.length });
        clips.push({ text: line.text, hash: line.hash, cached: false });
        return;
      }
      const objectKey = storeObject ? await storeObject(line.hash, bytes).catch(() => null) : null;
      const audioBase64 = bytesToBase64(bytes);
      try {
        await sql`insert into coach_speech (speech_hash, voice, chars, mime, audio_b64, object_key)
          values (${line.hash}, ${voice}, ${line.text.length}, 'audio/mpeg', ${audioBase64}, ${objectKey})
          on conflict (speech_hash) do nothing`;
      } catch {
        // This phone can still keep the bytes. The next request reads the row.
      }
      clips.push({ text: line.text, hash: line.hash, audioBase64, cached: false });
    }),
  );
  const order = new Map(unique.map((text, index) => [text, index]));
  clips.sort((a, b) => (order.get(a.text) ?? 0) - (order.get(b.text) ?? 0));
  return { ok: true, mode: "xai", voice, budget, clips };
}
