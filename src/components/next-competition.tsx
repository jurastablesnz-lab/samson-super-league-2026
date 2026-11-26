import { competitionCountdown } from "@/lib/competitions";
import { describeWhen, upcomingShows, type TargetShow } from "@/lib/plan-builder";
import { iso, TODAY } from "@/lib/season";
import { cn } from "@/lib/utils";
import { fmtDay } from "./setup-wizard";
import { Kicker } from "./beta-ui";

/**
 * The next upcoming competition on this horse’s plan (the same list as
 * Target competitions further down the Season tab), with its entry close date.
 */
export function NextCompetitionCard({
  shows,
  today = iso(TODAY),
}: {
  shows: TargetShow[];
  today?: string;
}) {
  const upcoming = upcomingShows(shows, today);
  const next = upcoming[0];
  const after = upcoming[1];

  if (!next) {
    return (
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <Kicker>Next competition</Kicker>
        <p className="mt-2 text-sm text-muted">
          {shows.length === 0
            ? "No competitions on this plan yet. Add them in Setup and they’ll show here."
            : "No upcoming competitions — the ones on this plan have finished."}
        </p>
      </section>
    );
  }

  const countdown = competitionCountdown(
    { start: next.start, end: next.end, entryClose: next.entriesClose },
    today,
  );
  const afterCountdown = after
    ? competitionCountdown(
        { start: after.start, end: after.end, entryClose: after.entriesClose },
        today,
      )
    : null;

  return (
    <section
      className={cn(
        "rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5",
        countdown.closeSoon && "ring-2 ring-warn",
      )}
    >
      <Kicker>Next competition</Kicker>
      <h2 className="font-display mt-1 text-xl leading-tight font-medium">{next.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {describeWhen(next)}
        {next.venue ? ` · ${next.venue}` : ""}
      </p>
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
          {next.entriesClose && (
            <p className={cn("text-xs", countdown.closeSoon ? "text-warn" : "text-faint")}>
              {fmtDay(next.entriesClose)}
            </p>
          )}
        </div>
      </div>
      {after && afterCountdown && (
        <p className="mt-3 text-sm text-muted">
          Then {after.name} · {describeWhen(after)}
          {after.venue ? ` · ${after.venue}` : ""}
          {` · ${afterCountdown.closeLabel}`}
          {after.entriesClose ? ` (${fmtDay(after.entriesClose)})` : ""}
        </p>
      )}
    </section>
  );
}
