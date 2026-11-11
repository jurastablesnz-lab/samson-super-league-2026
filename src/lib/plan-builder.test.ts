import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeWhen,
  floorPlanKind,
  generatePlan,
  phasesFor,
  sanitiseFloorPlan,
  sanitisePlanConfig,
  testsForLevel,
} from "./plan-builder.ts";
import { differenceInDays } from "date-fns";
import { WEEKS, PHASES } from "./season.ts";

const NOW = new Date("2026-11-08T00:00:00");

test("Samson's hand-written plan is unchanged by the engine refactor", () => {
  assert.equal(PHASES.map((p) => p.name).join(","), "Foundation,Consolidate,Prepare,Compete");
  assert.equal(WEEKS[0].id, "2026-09-13");
  assert.ok(WEEKS.some((w) => w.sessions.some((s) => s.kind === "show" && s.title === "BOP")));
});

test("generated plan uses the four phases, contiguous and ordered", () => {
  const plan = generatePlan(
    {
      horseName: "Bella",
      level: "Level 3",
      tests: ["3A", "3B"],
      shows: [
        { id: "a", name: "Area Day", start: "2027-01-10", end: "2027-01-10" },
        { id: "b", name: "Champs", start: "2027-03-05", end: "2027-03-07", travel: true },
      ],
      goals: ["qualify"],
    },
    NOW,
  );
  assert.deepEqual(plan.phases.map((p) => p.name), ["Foundation", "Consolidate", "Prepare", "Compete"]);
  for (let i = 1; i < plan.phases.length; i++) {
    assert.ok(plan.phases[i - 1].end < plan.phases[i].start, "phases do not overlap");
    assert.ok(plan.phases[i].start <= plan.phases[i].end, "phase has at least one day");
  }
  assert.equal(plan.phases[3].end, "2027-03-07");
  assert.equal(plan.mainTest, "3A");
  assert.equal(plan.homeworkTest, "3B");
  const sessions = plan.weeks.flatMap((w) => w.sessions);
  assert.ok(sessions.some((s) => s.kind === "show" && s.title === "Champs"));
  assert.ok(sessions.some((s) => s.kind === "travel" && s.day === "2027-03-04"));
  assert.ok(sessions.some((s) => s.kind === "rest" && s.day === "2027-03-08") || plan.weeks.at(-1)!.sessions.at(-1)!.day < "2027-03-08");
});

test("short show runways give Consolidate more than one day", () => {
  const phases = phasesFor("2026-11-01", [{ id: "soon", name: "Soon", start: "2026-12-12", end: "2026-12-13" }], "Level 2", []);
  const consolidate = phases.find((p) => p.id === "consolidate")!;
  assert.ok(differenceInDays(consolidate.end, consolidate.start) >= 6);
  assert.ok(phases.every((p) => p.start <= p.end));
});

test("cross-month dates include both month names", () => {
  assert.equal(describeWhen({ start: "2026-11-30", end: "2026-12-02" }), "30 Nov–2 Dec 2026");
});

test("main test sheet session uses main-test instructions, not homework", () => {
  const plan = generatePlan({ horseName: "Kahu", level: "Level 2", tests: ["2B", "2C"], shows: [{ id: "show", name: "Show", start: "2027-01-30", end: "2027-01-31" }], goals: ["learn_level"] }, NOW);
  const sheet = plan.weeks.flatMap((w) => w.sessions).find((s) => s.title === "2B from the sheet")!;
  assert.ok(sheet.how[0].startsWith("2B"));
  assert.ok(!sheet.how.join(" ").includes("2C"));
});

test("coaching text is gender-neutral", () => {
  const plan = generatePlan(
    { horseName: "Bella", level: "Level 1", tests: ["1A", "1B", "Level 1 musical freestyle"], shows: [], goals: ["move_up", "learn_level", "confidence", "freestyle"] },
    NOW,
  );
  const text = JSON.stringify(plan);
  for (const word of [" he ", " she ", " him ", " her ", " his ", " hers ", "He ", "She "]) {
    assert.ok(!text.includes(word), `found "${word.trim()}"`);
  }
});

test("no shows gives a 16-week block; short runway still keeps 4 phases", () => {
  const p = phasesFor("2026-11-08", [], "Level 2", []);
  assert.equal(p.length, 4);
  assert.equal(p[3].end, "2027-02-27");
  const q = phasesFor("2026-11-08", [{ id: "x", name: "Soon", start: "2026-11-12", end: "2026-11-12" }], "Level 2", []);
  assert.deepEqual(q.map((x) => x.name), ["Foundation", "Consolidate", "Prepare", "Compete"]);
  assert.ok(q.every((x) => x.start <= x.end));
});

test("sanitisePlanConfig drops junk and keeps known goals", () => {
  const c = sanitisePlanConfig(
    { tests: ["2A", 5, ""], goals: ["qualify", "hack"], shows: [{ name: "X", start: "2027-01-01" }, { name: "bad", start: "nope" }] },
    { horseName: "Rua", level: "Level 2" },
  );
  assert.deepEqual(c.tests, ["2A"]);
  assert.deepEqual(c.goals, ["qualify"]);
  assert.equal(c.shows.length, 1);
  assert.equal(c.shows[0].end, "2027-01-01");
  assert.equal(c.horseName, "Rua");
  assert.equal(c.floorPlan, null);
  assert.ok(testsForLevel("Level 4").includes("4B"));
});

test("a floor plan is a PDF or image kept on the device, and junk is dropped", () => {
  assert.equal(floorPlanKind({ type: "application/pdf", name: "plan.pdf" }), "pdf");
  assert.equal(floorPlanKind({ type: "", name: "plan.PDF" }), "pdf");
  assert.equal(floorPlanKind({ type: "image/jpeg", name: "sheet.jpg" }), "image");
  assert.equal(floorPlanKind({ type: "audio/mpeg", name: "music.mp3" }), null);
  const kept = sanitiseFloorPlan({
    mediaId: "floorplan-1",
    fileName: "susan-l2.pdf",
    mime: "application/pdf",
    size: 1200,
    storedOn: "device",
    uploadedAt: "2026-11-11T00:00:00.000Z",
  });
  assert.equal(kept?.mime, "application/pdf");
  assert.equal(
    sanitiseFloorPlan({ mediaId: "/audio/secret.mp3", fileName: "x.pdf", mime: "application/pdf" }),
    null,
  );
  const config = sanitisePlanConfig(
    {
      horseName: "Jura Samson",
      level: "Level 2",
      tests: ["2A"],
      floorPlan: kept,
      extra: "nope",
    },
    { horseName: "Jura Samson", level: "Level 2" },
  );
  assert.deepEqual(config.floorPlan, kept);
  const again = sanitisePlanConfig(config, { horseName: "Jura Samson", level: "Level 2" });
  assert.deepEqual(again.floorPlan, kept);
});
