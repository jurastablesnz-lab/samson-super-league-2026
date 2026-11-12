/**
 * Presigned R2 uploads and playback. The browser never receives the bucket keys.
 * When R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET is
 * missing, every call reports that cloud storage is off and the phone keeps
 * the file in IndexedDB.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function actor(userId: string) {
  const { requireAccess } = await import("./rider.server");
  const user = await requireAccess(userId);
  const { getSql } = await import("./db");
  const { storagePort } = await import("./media-r2.server");
  return { sql: await getSql(), port: storagePort(), user };
}

export const mediaStorage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { cloudConfigured } = await import("./media-r2.server");
    return { cloud: cloudConfigured() };
  });

export const beginMediaUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { mediaId?: string; kind?: string; fileName?: string; mime?: string; size?: number; horseId?: string }) => ({
      mediaId: text(input?.mediaId, 120),
      kind: text(input?.kind, 20),
      fileName: text(input?.fileName, 200),
      mime: text(input?.mime, 80),
      size: Number(input?.size) || 0,
      horseId: text(input?.horseId, 120),
    }),
  )
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { beginMediaUpload: begin } = await import("./media-store");
    return begin(sql, port, user.id, data);
  });

export const signMediaPart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string; partNumber?: number }) => ({
    mediaId: text(input?.mediaId, 120),
    partNumber: Number(input?.partNumber) || 0,
  }))
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { signMediaPart: sign } = await import("./media-store");
    return { url: await sign(sql, port, user.id, data.mediaId, data.partNumber) };
  });

export const listMediaParts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string }) => ({ mediaId: text(input?.mediaId, 120) }))
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { listMediaParts: list } = await import("./media-store");
    return { parts: await list(sql, port, user.id, data.mediaId) };
  });

export const completeMediaUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string; parts?: { partNumber?: number; etag?: string }[] }) => ({
    mediaId: text(input?.mediaId, 120),
    parts: (Array.isArray(input?.parts) ? input.parts : []).slice(0, 10000).map((part) => ({
      partNumber: Number(part?.partNumber) || 0,
      etag: text(part?.etag, 200),
    })),
  }))
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { completeMediaUpload: complete } = await import("./media-store");
    await complete(sql, port, user.id, data.mediaId, data.parts);
    return { ok: true as const };
  });

export const mediaReady = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaIds?: string[] }) => ({
    mediaIds: (Array.isArray(input?.mediaIds) ? input.mediaIds : []).slice(0, 200).map((id) => text(id, 120)),
  }))
  .handler(async ({ context, data }) => {
    const { sql, user } = await actor(context.userId);
    const { readyMediaIds } = await import("./media-store");
    return { ids: await readyMediaIds(sql, user.id, data.mediaIds) };
  });

export const mediaPlaybackUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string }) => ({ mediaId: text(input?.mediaId, 120) }))
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { playbackUrl } = await import("./media-store");
    return { url: await playbackUrl(sql, port, { userId: user.id, isAdmin: user.isAdmin }, data.mediaId) };
  });

export const deleteMediaObject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string }) => ({ mediaId: text(input?.mediaId, 120) }))
  .handler(async ({ context, data }) => {
    const { sql, port, user } = await actor(context.userId);
    const { deleteMediaObject: remove } = await import("./media-store");
    await remove(sql, port, user.id, data.mediaId);
    return { ok: true as const };
  });

export const listRiderFiles = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string }) => ({ userId: text(input?.userId, 120) }))
  .handler(async ({ context, data }) => {
    const { requireAdminUser } = await import("./rider.server");
    await requireAdminUser(context.userId);
    const { getSql } = await import("./db");
    const { listReadyMedia } = await import("./media-store");
    return { files: await listReadyMedia(await getSql(), data.userId) };
  });
