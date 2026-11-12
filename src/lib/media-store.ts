import type { Sql } from "./db.ts";
import {
  MEDIA_LIMITS,
  PART_SIZE,
  assertMediaId,
  isMediaKind,
  mimeAllowed,
  objectKey,
  partCount,
  type MediaKind,
} from "./media-object.ts";

export type StoragePort = {
  start(key: string, mime: string): Promise<string>;
  signPart(key: string, uploadId: string, partNumber: number): Promise<string>;
  parts(key: string, uploadId: string): Promise<{ partNumber: number; etag: string }[]>;
  finish(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]): Promise<void>;
  cancel(key: string, uploadId: string): Promise<void>;
  readUrl(key: string, mime: string, fileName: string): Promise<string>;
  remove(key: string): Promise<void>;
};

export type MediaRow = {
  id: string;
  user_id: string;
  horse_id: string | null;
  kind: string;
  object_key: string;
  file_name: string;
  mime: string;
  byte_size: number | string;
  status: string;
  upload_id: string;
  part_size: number | string;
};

export type BeginResult =
  | { mode: "local" }
  | { mode: "ready" }
  | { mode: "upload"; uploadId: string; partSize: number; partCount: number; size: number };

const asNumber = (value: number | string) => Number(value);

async function horseFor(sql: Sql, userId: string, horseId: string): Promise<string | null> {
  if (!horseId) return null;
  const rows = await sql<{ id: string }>`select id from horses where id = ${horseId} and user_id = ${userId}`;
  return rows[0]?.id ?? null;
}

async function rowFor(sql: Sql, mediaId: string): Promise<MediaRow | null> {
  const rows = await sql<MediaRow>`select id, user_id, horse_id, kind, object_key, file_name, mime,
    byte_size, status, upload_id, part_size from media_objects where id = ${mediaId}`;
  return rows[0] ?? null;
}

function ownPending(row: MediaRow | null, userId: string): MediaRow {
  if (!row || row.user_id !== userId) throw new Error("That file is not on your account.");
  if (row.status !== "pending" || !row.upload_id) throw new Error("That upload has already finished.");
  return row;
}

export async function beginMediaUpload(
  sql: Sql,
  port: StoragePort | null,
  userId: string,
  input: { mediaId: string; kind: string; fileName: string; mime: string; size: number; horseId?: string },
): Promise<BeginResult> {
  if (!port) return { mode: "local" };
  const mediaId = assertMediaId(input.mediaId);
  if (!isMediaKind(input.kind)) throw new Error("That file is not a video, a track, or a floor plan.");
  const kind: MediaKind = input.kind;
  const size = Math.round(Number(input.size));
  if (!Number.isFinite(size) || size <= 0 || size > MEDIA_LIMITS[kind]) {
    throw new Error("That file is too large to store.");
  }
  const fileName = input.fileName.trim().slice(0, 200) || "file";
  const mime = input.mime.trim().slice(0, 80);
  if (!mimeAllowed(kind, mime, fileName)) throw new Error("That file type is not allowed.");
  const key = objectKey(userId, kind, mediaId);
  const existing = await rowFor(sql, mediaId);
  if (existing && existing.user_id !== userId) throw new Error("That file belongs to another account.");
  if (existing && existing.status === "ready" && asNumber(existing.byte_size) === size) return { mode: "ready" };
  if (existing?.status === "pending" && existing.upload_id && asNumber(existing.byte_size) === size) {
    const partSize = asNumber(existing.part_size) || PART_SIZE;
    return { mode: "upload", uploadId: existing.upload_id, partSize, partCount: partCount(size, partSize), size };
  }
  if (existing?.upload_id) await port.cancel(existing.object_key, existing.upload_id).catch(() => undefined);
  const uploadId = await port.start(key, mime);
  const horseId = await horseFor(sql, userId, input.horseId?.trim() ?? "");
  await sql`insert into media_objects
    (id, user_id, horse_id, kind, object_key, file_name, mime, byte_size, status, upload_id, part_size)
    values (${mediaId}, ${userId}, ${horseId}, ${kind}, ${key}, ${fileName}, ${mime}, ${size}, 'pending', ${uploadId}, ${PART_SIZE})
    on conflict (id) do update set
      horse_id = excluded.horse_id,
      kind = excluded.kind,
      object_key = excluded.object_key,
      file_name = excluded.file_name,
      mime = excluded.mime,
      byte_size = excluded.byte_size,
      status = 'pending',
      upload_id = excluded.upload_id,
      part_size = excluded.part_size,
      updated_at = now()`;
  return { mode: "upload", uploadId, partSize: PART_SIZE, partCount: partCount(size), size };
}

export async function signMediaPart(
  sql: Sql,
  port: StoragePort | null,
  userId: string,
  mediaId: string,
  partNumber: number,
): Promise<string> {
  if (!port) throw new Error("Cloud storage is not configured.");
  const row = ownPending(await rowFor(sql, assertMediaId(mediaId)), userId);
  const count = partCount(asNumber(row.byte_size), asNumber(row.part_size) || PART_SIZE);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) {
    throw new Error("That piece of the file is not part of this upload.");
  }
  return port.signPart(row.object_key, row.upload_id, partNumber);
}

export async function listMediaParts(sql: Sql, port: StoragePort | null, userId: string, mediaId: string) {
  if (!port) return [];
  const row = await rowFor(sql, assertMediaId(mediaId));
  if (!row || row.user_id !== userId || row.status !== "pending" || !row.upload_id) return [];
  const count = partCount(asNumber(row.byte_size), asNumber(row.part_size) || PART_SIZE);
  const listed = await port.parts(row.object_key, row.upload_id);
  return listed.filter((part) => part.partNumber >= 1 && part.partNumber <= count && part.etag);
}

export async function completeMediaUpload(
  sql: Sql,
  port: StoragePort | null,
  userId: string,
  mediaId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<void> {
  if (!port) return;
  const id = assertMediaId(mediaId);
  const row = await rowFor(sql, id);
  if (!row || row.user_id !== userId) throw new Error("That file is not on your account.");
  if (row.status === "ready") return;
  const pending = ownPending(row, userId);
  const expected = partCount(asNumber(pending.byte_size), asNumber(pending.part_size) || PART_SIZE);
  const clean = parts
    .map((part) => ({ partNumber: Number(part.partNumber), etag: String(part.etag ?? "").trim() }))
    .filter((part) => part.etag.length > 0 && part.etag.length < 200)
    .sort((a, b) => a.partNumber - b.partNumber);
  if (clean.length !== expected || clean.some((part, index) => part.partNumber !== index + 1)) {
    throw new Error("The upload is still missing a piece.");
  }
  await port.finish(pending.object_key, pending.upload_id, clean);
  await sql`update media_objects set status = 'ready', upload_id = '', updated_at = now()
    where id = ${id} and user_id = ${userId}`;
}

export async function readyMediaIds(sql: Sql, userId: string, mediaIds: string[]): Promise<string[]> {
  const wanted = new Set(mediaIds.map((id) => id.trim()).filter(Boolean));
  if (wanted.size === 0) return [];
  const rows = await sql<{ id: string }>`select id from media_objects
    where user_id = ${userId} and status = 'ready'`;
  return rows.map((row) => row.id).filter((id) => wanted.has(id));
}

export async function playbackUrl(
  sql: Sql,
  port: StoragePort | null,
  actor: { userId: string; isAdmin: boolean },
  mediaId: string,
): Promise<string> {
  if (!port) return "";
  const row = await rowFor(sql, assertMediaId(mediaId));
  if (!row || row.status !== "ready") return "";
  if (row.user_id !== actor.userId && !actor.isAdmin) throw new Error("That file is private.");
  return port.readUrl(row.object_key, row.mime, row.file_name);
}

export async function deleteMediaObject(
  sql: Sql,
  port: StoragePort | null,
  userId: string,
  mediaId: string,
): Promise<void> {
  const id = assertMediaId(mediaId);
  const row = await rowFor(sql, id);
  if (!row || row.user_id !== userId) return;
  if (port && row.upload_id && row.status === "pending") {
    await port.cancel(row.object_key, row.upload_id).catch(() => undefined);
  }
  if (port) await port.remove(row.object_key).catch(() => undefined);
  await sql`delete from media_objects where id = ${id} and user_id = ${userId}`;
}

export async function listReadyMedia(sql: Sql, userId: string) {
  const rows = await sql<MediaRow>`select id, user_id, horse_id, kind, object_key, file_name, mime,
    byte_size, status, upload_id, part_size from media_objects
    where user_id = ${userId} and status = 'ready'
    order by updated_at desc
    limit 40`;
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    fileName: row.file_name,
    size: asNumber(row.byte_size),
    horseId: row.horse_id,
  }));
}
