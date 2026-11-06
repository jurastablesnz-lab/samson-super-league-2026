import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePlan } from "./plan-builder.ts";
import {
  applyCoachVisits,
  cleanCoachVisit,
  coachVisitDates,
  packKey,
  packingList,
  playableFreestyle,
} from "./rider-workspace.ts";

test("packing list follows this horse's tests and keeps stable tick ids", () => {
  const list = packingList(["3A", "3B", "Level 3 musical freestyle"]);
  const paper = list.find((g) => g.id === "paper");
  assert.ok(paper);
  assert.equal(paper.items.find((i) => i.id === "tests")?.label, "Printed 3A, 3B");
  assert.equal(JSON.stringify(list).includes("2B and 2C"), false);
  assert.equal(packKey("paper", "tests"), "paper:tests");
  assert.equal(packKey("horse", "bridle"), "horse:bridle");
  assert.equal(packingList([])[3].items.find((i) => i.id === "tests")?.label, "Printed test sheets");
});

test("coach visits land on school days only, for the visits passed in", () => {
  const plan = generatePlan(
    {
      horseName: "Kahu",
      level: "Level 2",
      tests: ["2A", "2B"],
      shows: [{ id: "show", name: "Taupo", start: "2027-02-06", end: "2027-02-07", travel: true }],
      goals: [],
      startDate: "2027-01-04",
    },
    new Date("2027-01-04T00:00:00Z"),
  );
  const sessions = (p: typeof plan, day: string) =>
    p.weeks.flatMap((w) => w.sessions).find((s) => s.day === day);

  const coached = applyCoachVisits(plan, [
    { date: "2027-01-12", endDate: "2027-01-12", title: "Polish", focus: "The halt" },
  ]);
  assert.equal(sessions(coached, "2027-01-12")?.kind, "coach");
  assert.equal(sessions(coached, "2027-01-12")?.title, "Polish");
  assert.equal(sessions(plan, "2027-01-12")?.kind === "coach", false);
  assert.match(
    coached.weeks.find((w) => w.sessions.some((s) => s.day === "2027-01-12"))?.headline ?? "",
    /Coach week/,
  );

  const onShow = applyCoachVisits(plan, [
    { date: "2027-02-06", title: "Nope", focus: "Should not replace the test" },
    { date: "2027-02-05", title: "Nope", focus: "Travel day stays" },
  ]);
  assert.equal(sessions(onShow, "2027-02-06")?.kind, "show");
  assert.equal(sessions(onShow, "2027-02-05")?.kind, "travel");
  assert.equal(JSON.stringify(coached).includes("Jura Samson"), false);
  assert.equal(JSON.stringify(coached).includes("/audio/samson"), false);
  for (const word of [" he ", " she ", " him ", " his "]) {
    assert.equal(JSON.stringify(sessions(coached, "2027-01-12")).includes(word), false);
  }
});

test("coach visit dates are inclusive and capped at 14 days", () => {
  assert.deepEqual(coachVisitDates("2027-03-01", "2027-03-02"), ["2027-03-01", "2027-03-02"]);
  assert.deepEqual(coachVisitDates("2027-03-01", "2027-03-20"), []);
  assert.equal(cleanCoachVisit({ date: "2027-03-01", title: "  Halt  " }).title, "Halt");
  assert.throws(() => cleanCoachVisit({ date: "2027-03-01", endDate: "2027-02-01" }), /finish date/);
  assert.throws(() => cleanCoachVisit({ date: "2027-03-01", endDate: "2027-03-20" }), /14 days/);
});

test("the pinned player uses only an uploaded track", () => {
  assert.equal(playableFreestyle(null), null);
  assert.equal(playableFreestyle({ mediaId: "", fileName: "samson-l2-mfs.mp3" }), null);
  assert.equal(playableFreestyle({ mediaId: "/audio/samson-l2-mfs.mp3", fileName: "Samson" }), null);
  assert.deepEqual(playableFreestyle({ mediaId: "freestyle-kahu", fileName: "kahu.mp3" }), {
    mediaId: "freestyle-kahu",
    title: "kahu.mp3",
  });
});
