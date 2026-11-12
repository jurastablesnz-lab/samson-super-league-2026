import { loadCoachCues, refreshCoachCues } from "./coach";
import type { CoachCue } from "./coach-cues";
import { putMediaBlob, readCoachCache, writeCoachCache } from "./media-db";

export type CachedCue = CoachCue & { audioUrl?: string };

type CacheRow = { cues: { n: number; text: string; source: "ai" | "edit"; audioId?: string }[] };

function cacheKey(horseId: string, testId: string) {
  return `${horseId}:${testId}`;
}

function audioId(horseId: string, testId: string, n: number, text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return `cue-${horseId}-${testId}-${n}-${hash.toString(16)}`;
}

async function withAudio(
  horseId: string,
  testId: string,
  cues: (CoachCue & { audioBase64?: string; audioUrl?: string })[],
): Promise<CachedCue[]> {
  const previous = await readCoachCache<CacheRow>(cacheKey(horseId, testId)).catch(() => null);
  const stored: CacheRow["cues"] = [];
  const playable: CachedCue[] = [];
  for (const cue of cues) {
    const kept = previous?.cues.find((item) => item.n === cue.n && item.text === cue.text && item.audioId);
    let blobId = kept?.audioId ?? "";
    if (cue.audioBase64) {
      const binary = atob(cue.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      blobId = audioId(horseId, testId, cue.n, cue.text);
      await putMediaBlob(blobId, new Blob([bytes], { type: "audio/mpeg" })).catch(() => undefined);
    }
    stored.push({ n: cue.n, text: cue.text, source: cue.source, audioId: blobId || undefined });
    playable.push({
      n: cue.n,
      text: cue.text,
      source: cue.source,
      audioUrl: blobId ? undefined : cue.audioUrl,
    });
  }
  await writeCoachCache(cacheKey(horseId, testId), { cues: stored }).catch(() => undefined);
  const { getMediaBlob } = await import("./media-db");
  return Promise.all(
    playable.map(async (cue, index) => {
      const id = stored[index]?.audioId;
      if (!id) return cue;
      const blob = await getMediaBlob(id).catch(() => undefined);
      if (!blob) return cue;
      return { ...cue, audioUrl: URL.createObjectURL(blob) };
    }),
  );
}

export async function cachedCallerCues(horseId: string, testId: string): Promise<CachedCue[]> {
  const row = await readCoachCache<CacheRow>(cacheKey(horseId, testId)).catch(() => null);
  if (!row?.cues) return [];
  const { getMediaBlob } = await import("./media-db");
  return Promise.all(
    row.cues.map(async (cue) => {
      if (!cue.audioId) return { n: cue.n, text: cue.text, source: cue.source };
      const blob = await getMediaBlob(cue.audioId).catch(() => undefined);
      return {
        n: cue.n,
        text: cue.text,
        source: cue.source,
        audioUrl: blob ? URL.createObjectURL(blob) : undefined,
      };
    }),
  );
}

export async function loadCallerCues(horseId: string, testId: string): Promise<{
  cues: CachedCue[];
  error: string | null;
}> {
  const local = await cachedCallerCues(horseId, testId);
  try {
    const remote = await loadCoachCues({ data: { horseId, testId } });
    if (!remote.ok) return { cues: local, error: remote.error };
    if (remote.cues.length === 0) return { cues: local, error: null };
    return { cues: await withAudio(horseId, testId, remote.cues), error: null };
  } catch {
    return { cues: local, error: local.length ? null : "Coaching is saved on this phone when you have a connection." };
  }
}

export async function refreshCallerCues(
  horseId: string,
  testId: string,
  testName: string,
  movements: { n: number; label: string }[],
): Promise<{ cues: CachedCue[]; error: string | null }> {
  try {
    const remote = await refreshCoachCues({ data: { horseId, testId, testName, movements } });
    if (!remote.ok) return { cues: await cachedCallerCues(horseId, testId), error: remote.error };
    return { cues: await withAudio(horseId, testId, remote.cues), error: null };
  } catch (err) {
    return {
      cues: await cachedCallerCues(horseId, testId),
      error: err instanceof Error ? err.message : "The coaching could not be written.",
    };
  }
}
