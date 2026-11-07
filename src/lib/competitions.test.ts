import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanCompetition, cleanTargetTests, competitionCountdown } from "./competitions.ts";

test("countdown highlights entry close within 7 days and names the event", () => {
  const soon = competitionCountdown(
    { start: "2026-11-20", end: "2026-11-21", entryClose: "2026-11-14" },
    "2026-11-07",
  );
  assert.equal(soon.eventLabel, "Starts in 13 days");
  assert.equal(soon.closeDays, 7);
  assert.equal(soon.closeSoon, true);
  assert.equal(soon.closeLabel, "Entries close in 7 days");

  const later = competitionCountdown(
    { start: "2026-12-01", end: "2026-12-01", entryClose: "2026-11-16" },
    "2026-11-07",
  );
  assert.equal(later.closeDays, 9);
  assert.equal(later.closeSoon, false);

  const today = competitionCountdown(
    { start: "2026-11-08", end: "2026-11-08", entryClose: "2026-11-07" },
    "2026-11-07",
  );
  assert.equal(today.eventLabel, "Starts tomorrow");
  assert.equal(today.closeLabel, "Entries close today");
  assert.equal(today.closeSoon, true);

  const closed = competitionCountdown(
    { start: "2026-11-20", end: "2026-11-21", entryClose: "2026-11-01" },
    "2026-11-07",
  );
  assert.equal(closed.closeLabel, "Entries closed");
  assert.equal(closed.closeSoon, false);

  const underway = competitionCountdown(
    { start: "2026-11-06", end: "2026-11-08", entryClose: "2026-10-01" },
    "2026-11-07",
  );
  assert.equal(underway.eventLabel, "On now");

  const finished = competitionCountdown({ start: "2026-10-01", end: "2026-10-02" }, "2026-11-07");
  assert.equal(finished.eventLabel, "Finished");
  assert.equal(finished.closeLabel, "Entry close not set");
  assert.equal(finished.closeSoon, false);
});

test("competition dates and schedule links are checked", () => {
  const saved = cleanCompetition({
    name: "  Taupō  ",
    start: "2026-11-20",
    venue: "NEC",
    scheduleUrl: "https://example.com/schedule",
  });
  assert.equal(saved.name, "Taupō");
  assert.equal(saved.end, "2026-11-20");
  assert.equal(saved.scheduleUrl, "https://example.com/schedule");
  assert.throws(
    () => cleanCompetition({ name: "X", start: "2026-11-20", end: "2026-11-01" }),
    /finish/,
  );
  assert.throws(
    () =>
      cleanCompetition({
        name: "X",
        start: "2026-11-20",
        entryOpen: "2026-11-10",
        entryClose: "2026-11-01",
      }),
    /close/,
  );
  assert.throws(
    () => cleanCompetition({ name: "X", start: "2026-11-20", scheduleUrl: "notaurl" }),
    /web address/,
  );
});

test("only the horse's own tests are stored on a target", () => {
  assert.deepEqual(cleanTargetTests(["2B", "Prix St Georges", "2B", "2A"], ["2A", "2B"]), [
    "2B",
    "2A",
  ]);
  assert.deepEqual(cleanTargetTests("2B", ["2B"]), []);
});
