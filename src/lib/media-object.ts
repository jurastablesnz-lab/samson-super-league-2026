/** Shared rules for rider videos, music and floor plans. No secrets and no network. */

export const MEDIA_KINDS = ["video", "music", "floorplan"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** S3 rejects every part but the last when it is under 5 MB. */
export const PART_SIZE = 8 * 1024 * 1024;

export const MEDIA_LIMITS: Record<MediaKind, number> = {
  video: 2 * 1024 * 1024 * 1024,
  music: 60 * 1024 * 1024,
  floorplan: 12 * 1024 * 1024,
};

/** Playback links expire quickly. The player asks for a fresh one each time it opens. */
export const PLAYBACK_SECONDS = 10 * 60;
/** A part URL has to survive a phone that stalls mid-upload. */
export const PART_URL_SECONDS = 60 * 60;

const MEDIA_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const ACCOUNT_ID = /^[A-Za-z0-9][A-Za-z0-9._@:-]{0,80}$/;

export function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

export function assertMediaId(value: string): string {
  const id = value.trim();
  if (!MEDIA_ID.test(id)) throw new Error("That file could not be named.");
  return id;
}

export function objectKey(userId: string, kind: MediaKind, mediaId: string): string {
  if (!ACCOUNT_ID.test(userId)) throw new Error("That account cannot store files.");
  return `users/${userId}/${kind}/${assertMediaId(mediaId)}`;
}

export function partCount(size: number, partSize = PART_SIZE): number {
  if (!Number.isFinite(size) || size <= 0) return 0;
  return Math.ceil(size / partSize);
}

export function partByteRange(
  partNumber: number,
  size: number,
  partSize = PART_SIZE,
): { start: number; end: number } {
  const start = (partNumber - 1) * partSize;
  const end = Math.min(start + partSize, size);
  return { start: Math.max(0, start), end: Math.max(0, end) };
}

/** Never report 100% until the server has confirmed the last part. */
export function uploadFraction(doneBytes: number, inflight: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const loaded = Math.max(0, doneBytes) + Math.max(0, inflight);
  return Math.min(0.99, loaded / total);
}

export function mimeAllowed(kind: MediaKind, mime: string, fileName: string): boolean {
  const type = mime.toLowerCase();
  const name = fileName.toLowerCase();
  if (kind === "video") return type.startsWith("video/") || /\.(mp4|mov|m4v)$/.test(name);
  if (kind === "music") return type.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg)$/.test(name);
  return type === "application/pdf" || type.startsWith("image/") || /\.(pdf|png|jpe?g|webp|gif|heic|heif)$/.test(name);
}

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/** All four must be set. A partial config stays on local storage. */
export function readR2Env(env: Record<string, string | undefined>): R2Env | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = env.R2_BUCKET?.trim() ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/**
 * CORS policy for the R2 bucket. The browser PUTs each part directly to R2 and
 * must be allowed to read the ETag response header. `origins` is the site the
 * rider is using, including the scheme, with no path.
 */
export function r2CorsPolicy(origins: string[]) {
  return [
    {
      AllowedOrigins: origins,
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ];
}
