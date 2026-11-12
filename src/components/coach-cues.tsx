import { useEffect, useState } from "react";
import { saveCoachCues } from "@/lib/coach";
import {
  cachedCallerCues,
  loadCallerCues,
  refreshCallerCues,
  type CachedCue,
} from "@/lib/coach-cache";
import { rewriteCueText } from "@/lib/coach-cues";

export type CueNaming = {
  riderName: string;
  dropNames: string[];
  spokenHorse: string;
  registeredName: string;
};

function named(cues: CachedCue[], naming?: CueNaming): CachedCue[] {
  if (!naming) return cues;
  return cues.map((cue) => ({ ...cue, text: rewriteCueText(cue.text, naming) }));
}

export function useCallerCues(
  active: boolean,
  horseId: string | undefined,
  testId: string,
  testName: string,
  movements: { n: number; label: string }[],
  naming?: CueNaming,
) {
  const [cues, setCues] = useState<CachedCue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!active || !horseId || !testId) return;
    let dead = false;
    void (async () => {
      const local = named(await cachedCallerCues(horseId, testId), naming);
      if (!dead && local.length) setCues(local);
      const loaded = await loadCallerCues(horseId, testId);
      if (dead) return;
      if (loaded.cues.length > 0) {
        setCues(named(loaded.cues, naming));
        setError(loaded.error);
        return;
      }
      setRefreshing(true);
      const fresh = await refreshCallerCues(horseId, testId, testName, movements);
      if (dead) return;
      setCues(named(fresh.cues, naming));
      setError(fresh.error);
      setRefreshing(false);
    })();
    return () => {
      dead = true;
    };
    // Movements are read once when this test opens. A later edit does not restart the ride.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, horseId, testId, naming?.riderName, naming?.spokenHorse, naming?.registeredName]);

  async function refresh() {
    if (!horseId || !testId) return;
    setRefreshing(true);
    setError(null);
    const fresh = await refreshCallerCues(horseId, testId, testName, movements);
    setCues(named(fresh.cues, naming));
    setError(fresh.error);
    setRefreshing(false);
  }

  return { cues, error, refreshing, refresh, replace: setCues };
}

export function CoachCueEditor({
  horseId,
  testId,
  movements,
  cues,
  onSaved,
}: {
  horseId: string;
  testId: string;
  movements: { n: number; label: string }[];
  cues: CachedCue[];
  onSaved: (cues: CachedCue[]) => void;
}) {
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const movementKey = movements.map((movement) => movement.n).join(",");
  useEffect(() => {
    const next: Record<number, string> = {};
    for (const movement of movements) {
      next[movement.n] = cues.find((cue) => cue.n === movement.n)?.text ?? "";
    }
    setDraft(next);
    // movementKey is the stable list of movement numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cues, movementKey]);

  async function save() {
    setBusy(true);
    setError(null);
    const result = await saveCoachCues({
      data: {
        horseId,
        testId,
        cues: movements.map((movement) => ({ n: movement.n, text: draft[movement.n] ?? "" })),
      },
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSaved(result.cues.map((cue) => ({ ...cue, audioUrl: cues.find((item) => item.n === cue.n)?.audioUrl })));
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs text-muted">
        Edits replace the generated line for that movement. A blank line stays blank.
      </p>
      {movements.map((movement) => (
        <label key={movement.n} className="block text-sm">
          <span className="font-semibold">
            {movement.n}. {movement.label}
          </span>
          <textarea
            className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
            rows={2}
            value={draft[movement.n] ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, [movement.n]: event.target.value }))}
          />
        </label>
      ))}
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="button"
        className="min-h-11 rounded-lg border border-line text-sm font-semibold disabled:opacity-50"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? "Saving…" : "Save coaching"}
      </button>
    </div>
  );
}
