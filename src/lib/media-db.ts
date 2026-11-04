const DB_NAME = "samson-review";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open the media store"));
  });
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
