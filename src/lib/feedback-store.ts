/**
 * Beta feedback storage. Takes the database and a small storage port so tests
 * can run on PGLite with a fake bucket. Server-only callers: src/lib/feedback.ts.
 */
import type { Sql } from "./db.ts";
import {
  MAX_VOICE_BYTES,
  baseAudioMime,
  voiceExtension,
  type FeedbackDraft,
  type FeedbackKind,
} from "./feedback-rules.ts";

/** The private bucket, seen only through these three calls. */
export type FeedbackAudioPort = {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  readUrl(key: string, mime: string, fileName: string): Promise<string>;
  remove(key: string): Promise<void>;
};

export type FeedbackAudio = { bytes: Uint8Array; mime: string };

export type FeedbackItem = {
  id: string;
  userId: string;
  riderName: string;
  riderEmail: string;
  kind: FeedbackKind;
  message: string;
  hasAudio: boolean;
  audioMime: string;
  audioMs: number;
  page: string;
  appVersion: string;
  userAgent: string;
  status: "open" | "handled";
  handledAt: string | null;
  handledBy: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  rider_name: string | null;
  rider_email: string | null;
  kind: FeedbackKind;
  message: string;
  audio_key: string | null;
  audio_mime: string;
  audio_ms: number | string;
  page: string;
  app_version: string;
  user_agent: string;
  status: "open" | "handled";
  handled_at: string | Date | null;
  handled_by: string | null;
  created_at: string | Date;
};

const iso = (v: string | Date | null | undefined) => (v == null ? null : new Date(v).toISOString());
const USER_ID = /^[A-Za-z0-9][A-Za-z0-9._@:-]{0,80}$/;
const FEEDBACK_ID = /^[A-Za-z0-9-]{8,80}$/;

/** Most a rider can send in ten minutes. Stops a stuck button from flooding the inbox. */
export const FEEDBACK_BURST = 10;

export function feedbackAudioKey(userId: string, id: string, mime: string): string {
  if (!USER_ID.test(userId)) throw new Error("That account cannot store files.");
  if (!FEEDBACK_ID.test(id)) throw new Error("That feedback could not be named.");
  const ext = voiceExtension(mime);
  if (!ext) throw new Error("That voice note is not a format we can keep.");
  return `feedback/${userId}/${id}.${ext}`;
}

function toItem(r: Row): FeedbackItem {
  return {
    id: r.id,
    userId: r.user_id,
    riderName: r.rider_name || r.rider_email || "A rider",
    riderEmail: r.rider_email ?? "",
    kind: r.kind,
    message: r.message,
    hasAudio: !!r.audio_key,
    audioMime: r.audio_mime,
    audioMs: Number(r.audio_ms) || 0,
    page: r.page,
    appVersion: r.app_version,
    userAgent: r.user_agent,
    status: r.status,
    handledAt: iso(r.handled_at),
    handledBy: r.handled_by,
    createdAt: iso(r.created_at) ?? "",
  };
}

const SELECT = `select f.id, f.user_id, f.kind, f.message, f.audio_key, f.audio_mime, f.audio_ms,
    f.page, f.app_version, f.user_agent, f.status, f.handled_at, f.handled_by, f.created_at,
    coalesce(nullif(a.full_name, ''), nullif(r.display_name, ''), nullif(u.name, '')) as rider_name,
    u.email as rider_email
  from beta_feedback f
  join "user" u on u.id = f.user_id
  left join beta_applications a on a.user_id = f.user_id
  left join riders r on r.user_id = f.user_id`;

export async function createFeedback(
  sql: Sql,
  port: FeedbackAudioPort | null,
  userId: string,
  draft: FeedbackDraft,
  audio: FeedbackAudio | null,
  newId: () => string = () => globalThis.crypto.randomUUID(),
): Promise<FeedbackItem> {
  const recent = await sql<{ n: number | string }>`select count(*) as n from beta_feedback
    where user_id = ${userId} and created_at > now() - interval '10 minutes'`;
  if (Number(recent[0]?.n ?? 0) >= FEEDBACK_BURST) {
    throw new Error("That's a lot of feedback at once. Try again in a few minutes.");
  }
  const id = newId();
  let key: string | null = null;
  let mime = "";
  let bytes = 0;
  if (audio && audio.bytes.byteLength > 0) {
    if (!port) throw new Error("Voice notes are not switched on yet. Type your feedback instead.");
    if (audio.bytes.byteLength > MAX_VOICE_BYTES)
      throw new Error("That voice note is too long. Keep it under two minutes.");
    mime = baseAudioMime(audio.mime);
    key = feedbackAudioKey(userId, id, mime);
    bytes = audio.bytes.byteLength;
    await port.put(key, audio.bytes, mime);
  }
  if (!draft.message && !key) throw new Error("Type a message or record a voice note first.");
  try {
    await sql`insert into beta_feedback (id, user_id, kind, message, audio_key, audio_mime, audio_bytes,
        audio_ms, page, app_version, user_agent)
      values (${id}, ${userId}, ${draft.kind}, ${draft.message}, ${key}, ${mime}, ${bytes},
        ${key ? draft.audioMs : 0}, ${draft.page}, ${draft.appVersion}, ${draft.userAgent})`;
  } catch (err) {
    if (key && port) await port.remove(key).catch(() => undefined);
    throw err;
  }
  const item = await getFeedback(sql, id);
  if (!item) throw new Error("Your feedback could not be saved.");
  return item;
}

export async function getFeedback(sql: Sql, id: string): Promise<FeedbackItem | null> {
  if (!FEEDBACK_ID.test(id)) return null;
  const rows = await sql.query<Row>(`${SELECT} where f.id = $1`, [id]);
  return rows[0] ? toItem(rows[0]) : null;
}

export async function listFeedback(
  sql: Sql,
  filter: "open" | "handled" | "all" = "all",
  limit = 200,
): Promise<FeedbackItem[]> {
  const where = filter === "all" ? "" : "where f.status = $2";
  const params: unknown[] = [Math.min(Math.max(1, limit), 500)];
  if (filter !== "all") params.push(filter);
  const rows = await sql.query<Row>(
    `${SELECT} ${where} order by (f.status = 'open') desc, f.created_at desc limit $1`,
    params,
  );
  return rows.map(toItem);
}

export async function setFeedbackStatus(
  sql: Sql,
  id: string,
  status: "open" | "handled",
  adminEmail: string | null,
): Promise<void> {
  if (!FEEDBACK_ID.test(id)) throw new Error("That feedback was not found.");
  if (status === "handled") {
    await sql`update beta_feedback set status = 'handled', handled_at = now(), handled_by = ${adminEmail},
      updated_at = now() where id = ${id}`;
  } else {
    await sql`update beta_feedback set status = 'open', handled_at = null, handled_by = null,
      updated_at = now() where id = ${id}`;
  }
}

export async function markFeedbackEmailed(sql: Sql, id: string): Promise<void> {
  await sql`update beta_feedback set emailed_at = now() where id = ${id}`;
}

/** Admin only: a short-lived private link to play one voice note. */
export async function feedbackAudioUrl(
  sql: Sql,
  port: FeedbackAudioPort | null,
  id: string,
): Promise<string> {
  if (!port || !FEEDBACK_ID.test(id)) return "";
  const rows = await sql<{
    audio_key: string | null;
    audio_mime: string;
    created_at: string | Date;
  }>`
    select audio_key, audio_mime, created_at from beta_feedback where id = ${id}`;
  const row = rows[0];
  if (!row?.audio_key) return "";
  const ext = row.audio_key.split(".").pop() ?? "m4a";
  const day = (iso(row.created_at) ?? "").slice(0, 10);
  return port.readUrl(row.audio_key, row.audio_mime, `xsalute-feedback-${day}.${ext}`);
}
