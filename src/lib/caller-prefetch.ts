import { speakCallerLines } from "./coach";
import { speechText } from "./caller-speech";
import { getMediaBlob, putMediaBlob, readCoachCache, writeCoachCache } from "./media-db";

type SpeechIndex = { voice: string; entries: Record<string, string> };

const INDEX_KEY = "tts-index";

function audioBlob(value: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "audio/mpeg" });
}

/** Download any spoken line that is not already on this phone. Cached lines are not generated again. */
export async function prefetchCallerSpeech(
  lines: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ urls: Record<string, string>; note: string | null }> {
  const unique = [...new Set(lines.map(speechText).filter(Boolean))];
  const urls: Record<string, string> = {};
  let done = 0;
  let note: string | null = null;
  const tick = () => onProgress?.(Math.min(done, unique.length), unique.length);
  tick();
  if (!unique.length) return { urls, note };
  const index =
    (await readCoachCache<SpeechIndex>(INDEX_KEY).catch(() => null)) ?? { voice: "", entries: {} };
  const missing: string[] = [];
  for (const text of unique) {
    const hash = index.voice ? index.entries[text] : "";
    const blob = hash ? await getMediaBlob(`tts:${hash}`).catch(() => undefined) : undefined;
    if (blob) {
      urls[text] = URL.createObjectURL(blob);
      done += 1;
    } else missing.push(text);
  }
  tick();
  for (let i = 0; i < missing.length; i += 4) {
    const batch = missing.slice(i, i + 4);
    let remote: Awaited<ReturnType<typeof speakCallerLines>> | null = null;
    try {
      remote = await speakCallerLines({ data: { lines: batch } });
    } catch {
      remote = null;
    }
    if (!remote?.ok || remote.mode !== "xai") {
      done = unique.length;
      tick();
      return { urls, note };
    }
    if (remote.budget === "spent") note = "Today's voice allowance is used. New lines use this phone's voice.";
    if (remote.voice) index.voice = remote.voice;
    const seen = new Set<string>();
    for (const clip of remote.clips) {
      const text = speechText(clip.text);
      seen.add(text);
      if (clip.audioBase64 && clip.hash) {
        const blob = audioBlob(clip.audioBase64);
        await putMediaBlob(`tts:${clip.hash}`, blob).catch(() => undefined);
        index.entries[text] = clip.hash;
        urls[text] = URL.createObjectURL(blob);
      }
      done += 1;
    }
    for (const text of batch) if (!seen.has(text)) done += 1;
    await writeCoachCache(INDEX_KEY, index).catch(() => undefined);
    tick();
  }
  if (done < unique.length) {
    done = unique.length;
    tick();
  }
  return { urls, note };
}
