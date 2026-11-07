import { useEffect, useState } from "react";
import { getTrainingBoard, setTrainingTarget } from "@/lib/competition-actions";
import { competitionCountdown, type TrainingBoard, type TrainingTarget } from "@/lib/competitions";
import { iso, TODAY } from "@/lib/season";
import { cn } from "@/lib/utils";
import { fmtDay } from "./setup-wizard";
import { Kicker } from "./beta-ui";

function when(target: TrainingTarget) {
  if (!target.start) return "";
  if (target.start === target.end) return fmtDay(target.start);
  return `${fmtDay(target.start)} – ${fmtDay(target.end)}`;
}

function TargetCard({
  target,
  today,
  onRemove,
  busy,
}: {
  target: TrainingTarget;
  today: string;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const countdown = competitionCountdown(target, today);
  return (
    <article className={cn("rounded-lg bg-bg p-3", countdown.closeSoon && "ring-2 ring-warn")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{target.name}</p>
          <p className="text-sm text-muted">
            {when(target)}
            {target.venue ? ` · ${target.venue}` : ""}
            {target.region ? ` · ${target.region}` : ""}
          </p>
        </div>
        {countdown.closeSoon && (
          <span className="shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-warn uppercase">
            Entries soon
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Event</p>
          <p className="font-display mt-0.5 text-lg leading-tight font-medium">
            {countdown.eventLabel}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Entries
          </p>
          <p
            className={cn(
              "font-display mt-0.5 text-lg leading-tight font-medium",
              countdown.closeSoon && "text-warn",
            )}
          >
            {countdown.closeLabel}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm">
        <span className="font-semibold">Tests: </span>
        {target.tests.length ? target.tests.join(", ") : "The tests on this horse’s plan"}
      </p>
      {target.offered && <p className="mt-1 text-xs text-muted">Offered: {target.offered}</p>}
      {target.notes && <p className="mt-1 text-xs text-faint">{target.notes}</p>}
      {target.scheduleUrl && (
        <a
          className="mt-2 inline-block text-sm font-semibold text-accent underline"
          href={target.scheduleUrl}
          target="_blank"
          rel="noreferrer"
        >
          Schedule
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          disabled={busy}
          className="mt-2 cursor-pointer text-xs font-semibold text-muted underline disabled:opacity-50"
          onClick={onRemove}
        >
          Remove from this plan
        </button>
      )}
    </article>
  );
}

/**
 * Competitions this horse is training towards. `editor` lets the rider add and
 * remove them; the summary on Today only shows the countdowns.
 */
export function TrainingTargets({
  horseId,
  tests,
  editor = false,
}: {
  horseId: string;
  tests: string[];
  editor?: boolean;
}) {
  const [board, setBoard] = useState<TrainingBoard | null>(null);
  const [competitionId, setCompetitionId] = useState("");
  const [picked, setPicked] = useState<string[]>(tests);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = iso(TODAY);

  useEffect(() => {
    let dead = false;
    setBoard(null);
    setError(null);
    getTrainingBoard({ data: { horseId } })
      .then((next) => {
        if (!dead) setBoard(next);
      })
      .catch((err: unknown) => {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      dead = true;
    };
  }, [horseId]);

  useEffect(() => {
    setPicked(tests);
  }, [tests]);

  if (!editor && !error && (!board || board.targets.length === 0)) return null;
  const available = (board?.catalog ?? []).filter(
    (item) => !board?.targets.some((target) => target.id === item.id),
  );

  async function change(id: string, on: boolean, chosen = picked) {
    setBusy(true);
    setError(null);
    try {
      setBoard(
        await setTrainingTarget({ data: { horseId, competitionId: id, tests: chosen, on } }),
      );
      if (on) setCompetitionId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <Kicker>Training towards</Kicker>
      <p className="mt-1 text-sm text-muted">
        Competitions on this horse’s plan, beside the tests you’re riding.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {!board && !error && <p className="mt-2 text-sm text-muted">Loading…</p>}
      {board && board.targets.length === 0 && board.catalog.length > 0 && (
        <p className="mt-2 text-sm text-muted">No competitions on this plan yet.</p>
      )}
      {board && board.targets.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {board.targets.map((target) => (
            <li key={target.id}>
              <TargetCard
                target={target}
                today={today}
                busy={busy}
                onRemove={editor ? () => void change(target.id, false) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {editor && board && available.length > 0 && (
        <form
          className="mt-4 space-y-3 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (competitionId) void change(competitionId, true, picked);
          }}
        >
          <label className="block text-sm font-semibold text-ink-soft">
            Add a competition
            <select
              className="mt-1 w-full rounded-lg border border-line bg-sunken px-3 py-2.5 text-[15px] font-normal text-fg"
              value={competitionId}
              onChange={(event) => setCompetitionId(event.target.value)}
            >
              <option value="">Choose…</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {tests.length > 0 && (
            <fieldset className="space-y-1">
              <legend className="text-sm font-semibold text-ink-soft">Tests you’re training</legend>
              {tests.map((test) => (
                <label key={test} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={picked.includes(test)}
                    onChange={(event) =>
                      setPicked((current) =>
                        event.target.checked
                          ? [...current, test]
                          : current.filter((item) => item !== test),
                      )
                    }
                  />
                  {test}
                </label>
              ))}
            </fieldset>
          )}
          <button
            type="submit"
            disabled={busy || !competitionId}
            className="w-full cursor-pointer rounded-lg border border-dashed border-accent/60 px-3 py-2.5 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add to this plan"}
          </button>
        </form>
      )}
      {editor && board && board.catalog.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          No competitions have been added yet. Susan adds them in Admin.
        </p>
      )}
    </section>
  );
}
