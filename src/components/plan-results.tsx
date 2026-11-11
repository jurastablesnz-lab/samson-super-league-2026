import { useState } from "react";
import type { HorseLog, ResultRecord } from "@/lib/rider-types";
import { groupResults, testsForRide, type RideView, type TestGroup } from "@/lib/result-summary";
import { setResultTest } from "@/lib/rider";
import { fmtDay } from "./setup-wizard";
import { Kicker } from "./beta-ui";

function percentLabel(percent: number | null, status: string) {
  if (status && status !== "ok") return status;
  if (percent == null) return "—";
  return `${percent.toFixed(1)}%`;
}

function placeLabel(place: string) {
  const text = place.trim();
  if (!/^\d+$/.test(text)) return text;
  const n = Number(text);
  const mod = n % 100;
  const suffix =
    mod >= 11 && mod <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

function RideLine({ ride }: { ride: RideView }) {
  return (
    <li className="text-sm">
      <span className="font-semibold tabular-nums">{percentLabel(ride.percent, ride.status)}</span>
      <span className="text-muted">
        {" "}
        · {fmtDay(ride.date) || "No date"} · {ride.showName || "Show"}
        {ride.place.trim() ? ` · ${placeLabel(ride.place)}` : ""}
        {ride.classNo ? ` · class ${ride.classNo}` : ""}
        {ride.detail ? ` · ${ride.detail}` : ""}
      </span>
    </li>
  );
}

function GroupBlock({ group }: { group: TestGroup }) {
  return (
    <div className="rounded-lg bg-bg p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{group.label}</p>
        <p className="font-mono text-xs text-muted tabular-nums">
          {group.count
            ? `Best ${group.best!.toFixed(1)}% · Worst ${group.worst!.toFixed(1)}% · Avg ${group.average!.toFixed(1)}% · ${group.count} ride${group.count === 1 ? "" : "s"}`
            : "No rides yet"}
        </p>
      </div>
      {group.rides.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {group.rides.map((ride) => (
            <RideLine key={ride.id} ride={ride} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Kept scores by dressage test, with other levels and untagged classes kept apart. */
export function PlanResults({
  results,
  horseId,
  horseLevel = "Level 2",
  onUpdated,
}: {
  results: ResultRecord[] | null;
  horseId?: string;
  horseLevel?: string;
  onUpdated?: (log: HorseLog) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const board = results ? groupResults(results, horseLevel) : null;

  async function assign(ride: RideView, test: string) {
    if (!horseId || !test) return;
    setBusyId(ride.id);
    setError(null);
    try {
      const log = await setResultTest({ data: { horseId, resultId: ride.id, test } });
      onUpdated?.(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <Kicker>Results · {board?.primary.section ?? horseLevel}</Kicker>
      {results == null && <p className="mt-2 text-sm text-muted">Loading…</p>}
      {results?.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          No results for this horse yet. Scores that match the ESNZ number load with the horse.
        </p>
      )}
      {board && (
        <div className="mt-3 flex flex-col gap-2">
          {board.primary.groups.map((group) => (
            <GroupBlock key={group.label} group={group} />
          ))}
        </div>
      )}
      {board?.others.map((section) => (
        <div key={section.section} className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            {section.section}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {section.groups.map((group) => (
              <GroupBlock key={group.label} group={group} />
            ))}
          </div>
        </div>
      ))}
      {board && board.unassigned.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Unassigned
          </p>
          <p className="mt-1 text-sm text-muted">
            These classes don’t say which test they were. Choose the test and the summary updates.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {board.unassigned.map((ride) => (
              <li key={ride.id} className="rounded-lg bg-bg p-3">
                <RideLine ride={ride} />
                <p className="mt-1 text-xs text-faint">{ride.level}</p>
                <label className="mt-2 block text-xs font-semibold text-muted">
                  Test
                  <select
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-fg"
                    defaultValue=""
                    disabled={busyId === ride.id}
                    onChange={(event) => void assign(ride, event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {testsForRide(ride.level).map((test) => (
                      <option key={test} value={test}>
                        {test}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
