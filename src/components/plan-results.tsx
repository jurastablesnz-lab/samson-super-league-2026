import type { ResultRecord } from "@/lib/rider-types";
import { summariseKeptScores } from "@/lib/result-summary";
import { fmtDay } from "./setup-wizard";
import { Kicker } from "./beta-ui";

function percentLabel(percent: number | null, status: string) {
  if (percent == null) return status || "—";
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

/** Kept scores for one horse: best and worst per class, then each ride. */
export function PlanResults({ results }: { results: ResultRecord[] | null }) {
  const summaries = results ? summariseKeptScores(results) : [];
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <Kicker>Results</Kicker>
      {results == null && <p className="mt-2 text-sm text-muted">Loading…</p>}
      {results?.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          No results for this horse yet. Scores that match the ESNZ number load with the horse.
          Typing a score, or a photo of a judge sheet, is a second way to add one.
        </p>
      )}
      {summaries.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {summaries.map((summary) => (
            <li key={summary.key} className="rounded-lg bg-bg p-3">
              <p className="text-sm font-semibold">
                {summary.label}
                {summary.level ? (
                  <span className="font-normal text-muted"> · {summary.level}</span>
                ) : null}
              </p>
              <p className="mt-1 font-mono text-xs text-muted tabular-nums">
                Best {summary.best.toFixed(1)}% · Worst {summary.worst.toFixed(1)}% · Avg{" "}
                {summary.average.toFixed(1)}%{summary.count > 1 ? ` · ${summary.count} scores` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {results && results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {results.map((result) => (
            <li key={result.id} className="rounded-lg bg-bg p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold">{result.test || "Test"}</p>
                <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-good">
                  {percentLabel(result.percent, result.status)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted">{result.showName || "Show"}</p>
              <p className="mt-0.5 text-xs text-faint">
                {fmtDay(result.date) || "No date"}
                {result.place.trim() ? ` · ${placeLabel(result.place)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
