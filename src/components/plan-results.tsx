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

function Summary({ group }: { group: TestGroup }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold">{group.label}</p>
        <p className="text-xs text-muted">
          {group.count ? `${group.count} ride${group.count === 1 ? "" : "s"}` : "No rides yet"}
        </p>
      </div>
      {group.count > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums">
          <span className="font-semibold text-good">Best {group.best!.toFixed(1)}%</span>
          <span className="text-muted">Worst {group.worst!.toFixed(1)}%</span>
          <span className="text-muted">Avg {group.average!.toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}

function RideRow({
  ride,
  busy,
  onAssign,
}: {
  ride: RideView;
  busy: boolean;
  onAssign?: (test: string) => void;
}) {
  const known = ride.family;
  return (
    <li className="rounded-lg bg-bg px-3 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="w-16 shrink-0 text-base font-semibold">{known ?? "Test?"}</span>
        <span className="text-base font-semibold tabular-nums">
          {percentLabel(ride.percent, ride.status)}
        </span>
        {ride.place.trim() ? (
          <span className="text-sm text-muted">{placeLabel(ride.place)}</span>
        ) : null}
      </div>
      {!known && onAssign && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {testsForRide(ride.level).map((test) => (
            <button
              key={test}
              type="button"
              disabled={busy}
              onClick={() => onAssign(test)}
              className="min-h-11 cursor-pointer rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              {test}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-sm text-muted">{ride.showName || "Show"}</p>
      <p className="text-xs text-faint">{fmtDay(ride.date) || "No date"}</p>
    </li>
  );
}

function ridesFor(groups: TestGroup[], unassigned: RideView[], section: string) {
  return [
    ...groups.flatMap((group) => group.rides),
    ...unassigned.filter((ride) => ride.section === section),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Level 2 summary first, then each ride as test, score, place, show and date. */
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
  const primaryRides = board
    ? [
        ...ridesFor(board.primary.groups, board.unassigned, board.primary.section),
        ...board.unassigned.filter(
          (ride) =>
            ride.section !== board.primary.section &&
            !board.others.some((section) => section.section === ride.section),
        ),
      ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    : [];

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
            <Summary key={group.label} group={group} />
          ))}
        </div>
      )}
      {primaryRides.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {primaryRides.map((ride) => (
            <RideRow
              key={ride.id}
              ride={ride}
              busy={busyId === ride.id}
              onAssign={horseId ? (test) => void assign(ride, test) : undefined}
            />
          ))}
        </ul>
      )}
      {board?.others.map((section) => {
        const rides = ridesFor(section.groups, board.unassigned, section.section);
        return (
          <div key={section.section} className="mt-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
              {section.section}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {section.groups.map((group) => (
                <Summary key={group.label} group={group} />
              ))}
            </div>
            {rides.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {rides.map((ride) => (
                  <RideRow
                    key={ride.id}
                    ride={ride}
                    busy={busyId === ride.id}
                    onAssign={horseId ? (test) => void assign(ride, test) : undefined}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
