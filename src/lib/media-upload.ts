import {
  beginMediaUpload,
  completeMediaUpload,
  deleteMediaObject,
  listMediaParts,
  mediaPlaybackUrl,
  mediaReady,
  mediaStorage,
  signMediaPart,
} from "./media";
import {
  clearUploadJournal,
  deleteMediaBlob,
  getMediaBlob,
  putMediaBlob,
  readUploadJournal,
  storeVideoFile,
  writeUploadJournal,
} from "./media-db";
import { partByteRange, partCount, uploadFraction, type MediaKind } from "./media-object";

export const PENDING_UPLOAD =
  "Saved on this phone. It will upload to your account when the connection holds.";

export type SavedMedia = { where: "device" | "cloud"; pendingCloud: boolean };

export type MediaRef = {
  id: string;
  kind: MediaKind;
  fileName: string;
  mime: string;
  horseId?: string;
};

let cloudLookup: Promise<boolean> | null = null;
const inflight = new Set<string>();

export function mediaCloudOn(): Promise<boolean> {
  cloudLookup ??= mediaStorage()
    .then((result) => result.cloud)
    .catch(() => false);
  return cloudLookup;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function putPart(url: string, body: Blob, onBytes: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onBytes(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("A piece of the upload did not land."));
        return;
      }
      const etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag");
      if (!etag) {
        reject(new Error("The upload did not confirm this piece."));
        return;
      }
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error("The connection dropped."));
    xhr.onabort = () => reject(new Error("The upload was interrupted."));
    xhr.send(body);
  });
}

async function uploadParts(
  ref: MediaRef,
  file: Blob,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const started = await beginMediaUpload({
    data: {
      mediaId: ref.id,
      kind: ref.kind,
      fileName: ref.fileName,
      mime: ref.mime,
      size: file.size,
      horseId: ref.horseId,
    },
  });
  if (started.mode === "ready") {
    await clearUploadJournal(ref.id).catch(() => undefined);
    onProgress?.(1);
    return;
  }
  if (started.mode === "local") return;
  const journal = await readUploadJournal(ref.id).catch(() => null);
  const known = new Map<number, string>();
  if (journal && journal.uploadId === started.uploadId) {
    for (const [number, etag] of Object.entries(journal.parts)) known.set(Number(number), etag);
  }
  const remote = await listMediaParts({ data: { mediaId: ref.id } }).catch(() => ({ parts: [] }));
  for (const part of remote.parts) known.set(part.partNumber, part.etag);

  const saveJournal = () =>
    writeUploadJournal(ref.id, {
      uploadId: started.uploadId,
      partSize: started.partSize,
      size: file.size,
      parts: Object.fromEntries([...known].map(([number, etag]) => [String(number), etag])),
    });

  const total = file.size;
  const report = (inflight: number) => {
    let done = 0;
    for (const number of known.keys()) {
      const range = partByteRange(number, total, started.partSize);
      done += range.end - range.start;
    }
    onProgress?.(known.size >= partCount(total, started.partSize) ? 0.99 : uploadFraction(done, inflight, total));
  };
  report(0);

  for (let number = 1; number <= started.partCount; number += 1) {
    if (known.has(number)) continue;
    const range = partByteRange(number, total, started.partSize);
    const chunk = file.slice(range.start, range.end);
    let etag = "";
    let last: unknown;
    for (let attempt = 0; attempt < 4 && !etag; attempt += 1) {
      try {
        const signed = await signMediaPart({ data: { mediaId: ref.id, partNumber: number } });
        etag = await putPart(signed.url, chunk, (loaded) => report(loaded));
      } catch (err) {
        last = err;
        await sleep(500 * 2 ** attempt);
      }
    }
    if (!etag) throw last instanceof Error ? last : new Error("The upload stopped.");
    known.set(number, etag);
    await saveJournal().catch(() => undefined);
    report(0);
  }

  await completeMediaUpload({
    data: {
      mediaId: ref.id,
      parts: [...known].map(([partNumber, etag]) => ({ partNumber, etag })),
    },
  });
  await clearUploadJournal(ref.id).catch(() => undefined);
  onProgress?.(1);
}

/**
 * Keep a local copy first. Upload it when R2 is configured. If the connection
 * drops, the local file stays and the next open continues the same upload.
 */
export async function saveAccountMedia(
  ref: MediaRef & { file: Blob; onProgress?: (ratio: number) => void },
): Promise<SavedMedia> {
  const cloud = await mediaCloudOn();
  let local = false;
  try {
    if (ref.kind === "video") await storeVideoFile(ref.id, ref.file);
    else await putMediaBlob(ref.id, ref.file);
    local = true;
  } catch (err) {
    if (!cloud) throw err;
  }
  if (!cloud) return { where: "device", pendingCloud: false };
  if (inflight.has(ref.id)) return { where: local ? "device" : "cloud", pendingCloud: !local };
  inflight.add(ref.id);
  try {
    await uploadParts(ref, ref.file, ref.onProgress);
    return { where: "cloud", pendingCloud: false };
  } catch (err) {
    if (local) return { where: "device", pendingCloud: true };
    throw err instanceof Error ? err : new Error("Could not upload the file.");
  } finally {
    inflight.delete(ref.id);
  }
}

export async function removeAccountMedia(id: string): Promise<void> {
  await deleteMediaBlob(id).catch(() => undefined);
  await clearUploadJournal(id).catch(() => undefined);
  if (!(await mediaCloudOn())) return;
  await deleteMediaObject({ data: { mediaId: id } }).catch(() => undefined);
}

export async function openMedia(
  id: string,
): Promise<{ url: string; source: "device" | "cloud"; revoke: () => void } | null> {
  const blob = await getMediaBlob(id).catch(() => undefined);
  if (blob) {
    const url = URL.createObjectURL(blob);
    return { url, source: "device", revoke: () => URL.revokeObjectURL(url) };
  }
  if (!(await mediaCloudOn())) return null;
  try {
    const signed = await mediaPlaybackUrl({ data: { mediaId: id } });
    if (!signed.url) return null;
    return { url: signed.url, source: "cloud", revoke: () => undefined };
  } catch {
    return null;
  }
}

/** Local bytes, or a download of the private file when this phone does not have it. */
export async function readMediaBlob(id: string): Promise<Blob | undefined> {
  const local = await getMediaBlob(id).catch(() => undefined);
  if (local) return local;
  const opened = await openMedia(id);
  if (!opened || opened.source !== "cloud") return undefined;
  try {
    const response = await fetch(opened.url);
    if (!response.ok) return undefined;
    return await response.blob();
  } catch {
    return undefined;
  }
}

let queue: Promise<void> = Promise.resolve();

/** Upload files already on this phone. The local copy is kept until the cloud confirms. */
export function syncLocalMedia(refs: MediaRef[]): void {
  const pending = refs.filter((ref) => ref.id && !inflight.has(ref.id));
  if (pending.length === 0) return;
  queue = queue
    .then(async () => {
      if (!(await mediaCloudOn())) return;
      let ready = new Set<string>();
      try {
        const result = await mediaReady({ data: { mediaIds: pending.map((ref) => ref.id) } });
        ready = new Set(result.ids);
      } catch {
        return;
      }
      for (const ref of pending) {
        if (ready.has(ref.id)) {
          await clearUploadJournal(ref.id).catch(() => undefined);
          continue;
        }
        const blob = await getMediaBlob(ref.id).catch(() => undefined);
        if (!blob) continue;
        try {
          await saveAccountMedia({ ...ref, file: blob });
        } catch {
          // The local copy is still here. The next open tries again.
        }
      }
    })
    .catch(() => undefined);
}
