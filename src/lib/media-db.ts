const DB_NAME = "samson-review";
const STORE = "blobs";
const UPLOADS = "uploads";
const COACH = "coach";

export type UploadJournal = {
  uploadId: string;
  partSize: number;
  size: number;
  parts: Record<string, string>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      if (!req.result.objectStoreNames.contains(UPLOADS)) req.result.createObjectStore(UPLOADS);
      if (!req.result.objectStoreNames.contains(COACH)) req.result.createObjectStore(COACH);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open the media store"));
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 MB";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Null when the file fits. Otherwise a message that names the size and the free space. */
export function storageShortfall(
  bytes: number,
  estimate: { quota?: number; usage?: number } | null | undefined,
): string | null {
  const quota = estimate?.quota;
  const usage = estimate?.usage;
  if (quota == null || usage == null || quota <= 0) return null;
  const free = Math.max(0, quota - usage);
  if (bytes <= free) return null;
  return `This video is ${formatBytes(bytes)}. This browser has about ${formatBytes(free)} free for videos on this site (limit ${formatBytes(quota)}). It was not saved.`;
}

/**
 * Ask the browser to keep this site's storage, then store the file as a Blob.
 * The File is handed to IndexedDB directly. It is not read into a string.
 */
export async function storeVideoFile(id: string, file: Blob): Promise<void> {
  const storage = globalThis.navigator?.storage;
  try {
    await storage?.persist?.();
  } catch {
    // Persistence is optional. The file can still be saved for this visit.
  }
  let estimate: { quota?: number; usage?: number } | undefined;
  try {
    estimate = await storage?.estimate?.();
  } catch {
    estimate = undefined;
  }
  const short = storageShortfall(file.size, estimate);
  if (short) throw new Error(short);
  try {
    await putMediaBlob(id, file);
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "QuotaExceededError") {
      throw new Error(
        storageShortfall(file.size, estimate) ??
          `This video is ${formatBytes(file.size)} and the browser ran out of space for this site. It was not saved.`,
      );
    }
    throw err instanceof Error ? err : new Error("Could not save the video.");
  }
}

export async function putMediaBlob(id: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save the file"));
  });
  db.close();
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error ?? new Error("Could not read the file"));
  });
  db.close();
  return blob;
}

async function withUploads<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  const value = await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(UPLOADS, mode);
    const req = run(tx.objectStore(UPLOADS));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not update the upload"));
  });
  db.close();
  return value;
}

export async function readUploadJournal(id: string): Promise<UploadJournal | null> {
  const row = await withUploads<UploadJournal | undefined>("readonly", (store) => store.get(id));
  return row ?? null;
}

export async function writeUploadJournal(id: string, journal: UploadJournal): Promise<void> {
  await withUploads("readwrite", (store) => store.put(journal, id));
}

export async function clearUploadJournal(id: string): Promise<void> {
  await withUploads("readwrite", (store) => store.delete(id));
}

export async function readCoachCache<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(COACH, "readonly");
    const req = tx.objectStore(COACH).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error("Could not read coaching"));
  });
  db.close();
  return value ?? null;
}

export async function writeCoachCache<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(COACH, "readwrite");
    tx.objectStore(COACH).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save coaching"));
  });
  db.close();
}

export async function deleteMediaBlob(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete the file"));
  });
  db.close();
}

/**
 * Shrinks a sheet photo to fit maxBase64 characters (default 650k, about 480 KB JPEG),
 * so six pages still fit in one request under the server body limit.
 */
export async function compressSheetPhoto(
  file: File,
  maxBase64 = 650_000,
): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    const dataUrl = await blobToDataUrl(file);
    if (dataUrl.length > maxBase64) {
      throw new Error("That photo is too big to read. Take it again, closer, as a normal photo.");
    }
    return { blob: file, dataUrl };
  }
  const attempts: [number, number][] = [
    [1600, 0.72],
    [1600, 0.6],
    [1400, 0.6],
    [1250, 0.55],
    [1100, 0.5],
    [950, 0.45],
  ];
  let last: { blob: Blob; dataUrl: string } | null = null;
  try {
    for (const [max, quality] of attempts) {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare the photo");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (next) => (next ? resolve(next) : reject(new Error("Could not prepare the photo"))),
          "image/jpeg",
          quality,
        );
      });
      last = { blob, dataUrl: await blobToDataUrl(blob) };
      const base64Len = last.dataUrl.length - last.dataUrl.indexOf(",") - 1;
      if (base64Len <= maxBase64) return last;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("That photo is too detailed to send. Take it again a little closer.");
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the photo"));
    reader.readAsDataURL(blob);
  });
}
