/**
 * Owner only: bring the original single-rider plan's localStorage (Samson) into
 * Postgres, then keep the two in step.
 *
 * 1. Not imported yet  → banner: "Import Samson's data from this device".
 *    Import is add-only; nothing is removed from localStorage (ever).
 * 2. Imported          → on load, the server copy is MERGED into this device
 *    (union by id — a new device picks up everything, an old device keeps its
 *    own rows), then every change here is mirrored to the server (debounced).
 */
import { useEffect, useRef, useState } from "react";
import { getLegacyState, importLegacy, syncLegacy } from "@/lib/rider";
import {
  mergeSnapshots,
  snapshotCounts,
  snapshotIsEmpty,
  type LegacySnapshot,
} from "@/lib/rider-types";
import { usePlan, type Score } from "@/lib/store";

function currentSnapshot(): LegacySnapshot {
  const s = usePlan.getState();
  return {
    done: s.done,
    pack: s.pack,
    scores: s.scores.filter((x) => !x.official && !x.id.startsWith("evo-")),
    notes: s.notes,
    review: s.review,
  };
}

function applySnapshot(snap: LegacySnapshot) {
  const official = usePlan.getState().scores.filter((x) => x.official || x.id.startsWith("evo-"));
  usePlan.setState({
    done: snap.done,
    pack: snap.pack,
    scores: [...official, ...(snap.scores as Score[])],
    notes: snap.notes,
    review: snap.review,
  });
}

type Phase = "checking" | "offer" | "importing" | "synced" | "error" | "hidden";

export function OwnerSync() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [msg, setMsg] = useState("");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsub = useRef<(() => void) | null>(null);

  function startMirror() {
    unsub.current?.();
    unsub.current = usePlan.subscribe((state, prev) => {
      if (
        state.done === prev.done &&
        state.pack === prev.pack &&
        state.scores === prev.scores &&
        state.notes === prev.notes &&
        state.review === prev.review
      ) {
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void syncLegacy({ data: { snapshot: currentSnapshot() } })
          .then((r) => setSyncedAt(r.syncedAt))
          .catch((e: unknown) => {
            setPhase("error");
            setMsg(`Couldn’t save to your account: ${e instanceof Error ? e.message : String(e)}. Your data is still on this device.`);
          });
      }, 1500);
    });
  }

  useEffect(() => {
    let cancelled = false;
    getLegacyState()
      .then(async (state) => {
        if (cancelled) return;
        if (!state.imported) {
          setPhase("offer");
          return;
        }
        const local = currentSnapshot();
        const merged = state.snapshot ? mergeSnapshots(local, state.snapshot) : local;
        applySnapshot(merged);
        // Push the union back so the server has this device's rows too.
        const r = await syncLegacy({ data: { snapshot: merged } });
        setSyncedAt(r.syncedAt);
        setPhase("synced");
        startMirror();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPhase("error");
        setMsg(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      unsub.current?.();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function runImport() {
    setPhase("importing");
    try {
      const local = currentSnapshot();
      const res = await importLegacy({ data: { snapshot: local } });
      applySnapshot(mergeSnapshots(local, res.snapshot));
      setSyncedAt(new Date().toISOString());
      setPhase("synced");
      startMirror();
    } catch (e) {
      setPhase("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  if (phase === "checking" || phase === "hidden") return null;
  if (phase === "synced") {
    return (
      <p className="bg-accent/10 px-4 py-1.5 text-center text-[11px] text-ink-soft">
        Samson’s plan is saved to your account
        {syncedAt ? ` · synced ${new Date(syncedAt).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}` : ""}
      </p>
    );
  }
  if (phase === "error") {
    return <p className="bg-danger/15 px-4 py-2 text-center text-[12px] text-danger">{msg}</p>;
  }
  const local = currentSnapshot();
  const c = snapshotCounts(local);
  return (
    <div className="bg-violet/15 px-4 py-3 text-center text-[12.5px] leading-snug text-ink-soft">
      <p className="font-semibold">Save Samson’s data to your account</p>
      <p className="mt-0.5">
        {snapshotIsEmpty(local)
          ? "Nothing logged on this device yet — import anyway to start saving to your account."
          : `This device has ${c.scores} scores, ${c.notes} notes, ${c.sheets} judge sheets and ${c.ticks} ticked sessions.`}{" "}
        Importing copies them into the database so they’re safe and on every device. Nothing is deleted from this device.
      </p>
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          disabled={phase === "importing"}
          className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg"
          onClick={() => void runImport()}
        >
          {phase === "importing" ? "Importing…" : "Import Samson’s data"}
        </button>
        <button type="button" className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs" onClick={() => setPhase("hidden")}>
          Not now
        </button>
      </div>
    </div>
  );
}
