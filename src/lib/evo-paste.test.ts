import test from "node:test";
import assert from "node:assert/strict";
import { parseEvoResultsPaste } from "./evo-paste.ts";

const standard =
  "03/10/2026\tDCD Kiwi Arena Rakes Premier League Show 2026\tDressage\tNicole Bours\t701\tLevel 7\t4\t64.7\tJ1:65.1/3 J2:64.9/4 J3:64.2/4";

test("parses the EVO horse-results row and its per-judge detail", () => {
  const parsed = parseEvoResultsPaste(standard);
  assert.equal(parsed.format, "evo_table");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].date, "2026-10-03");
  assert.equal(parsed.rows[0].event, "DCD Kiwi Arena Rakes Premier League Show 2026");
  assert.equal(parsed.rows[0].rider, "Nicole Bours");
  assert.equal(parsed.rows[0].percent, 64.7);
  assert.equal(parsed.rows[0].place, "4");
  assert.equal(parsed.rows[0].level, "Level 7");
  assert.equal(parsed.rows[0].test, "701 — Level 7");
  assert.equal(parsed.rows[0].judges, "J1:65.1 J2:64.9 J3:64.2");
  assert.equal(parsed.rows[0].status, "ok");
});

test("rebuilds wrapped cells including rider and level names", () => {
  const wrapped = [
    "03/10/2026\tDCD Kiwi Arena Rakes Premier League Show\tDressage\tNicole\t701\tElementary\t4\t64.7\tJ1:65.1/3 J2:64.9/4",
    " 2026",
    "Bours",
    "(L3)",
    "",
    "05/10/2026\tDCD Kiwi Arena Rakes Premier League Show\tDressage\tNicole\t702\tElementary\t—\t64.1\tJ1:64.0/3",
    " 2026",
    "Bours",
    "(L3)",
    "",
  ].join("\n");
  const parsed = parseEvoResultsPaste(wrapped);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].rider, "Nicole Bours");
  assert.equal(parsed.rows[0].level, "Elementary (L3)");
  assert.equal(parsed.rows[0].event, "DCD Kiwi Arena Rakes Premier League Show 2026");
  assert.equal(parsed.rows[1].place, "");
  assert.equal(parsed.rows[1].date, "2026-10-05");
});

test("drops eliminated, empty and informational non-dressage rows, but keeps Para", () => {
  const rows = [
    standard,
    "04/10/2026\tKiwi Arena\tDressage\tNicole Bours\t701\tL7\t—\tE\tEliminated",
    "04/10/2026\tKiwi Arena\tDressage\tNicole Bours\t701\tL7\t—\t—\tNo score",
    "04/10/2026\tKiwi Arena\tDressage\tNicole Bours\t701\tL7\t—\t\tEmpty result",
    "05/10/2026\tKiwi Arena\tHave a Go\tNicole Bours\t101\tIntro\t—\t64.1\tUnofficial",
    "05/10/2026\tKiwi Arena\tRider Alphabetical\tNicole Bours\t—\t—\t—\t—\tInformation",
    "05/10/2026\tCancelled competition\tDressage\tNicole Bours\t701\tL7\t—\t64.1\tCancelled",
    "05/10/2026\tKiwi Arena\tPara Equestrian Dressage\tNicole Bours\t701\tGrade III\t1\t67.2\tJ1:67.2/1",
    "05/10/2026\tKiwi Arena\tPara\tNicole Bours\t702\tGrade III\t2\t66.8\tJ1:66.8/2",
  ].join("\n");
  const parsed = parseEvoResultsPaste(rows);
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(
    parsed.rows.map((row) => row.percent),
    [64.7, 67.2, 66.8],
  );
  assert.equal(parsed.skipped, 6);
});

test("accepts the existing EVO CSV format", () => {
  const parsed = parseEvoResultsPaste(
    "Date,Event,Rider,Class,Level,Place,Percentage,Status\n03/10/2026,Kiwi Arena,Nicole Bours,701,L7,4,64.7,ok\n",
  );
  assert.equal(parsed.format, "csv");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].percent, 64.7);
});

test("does not treat a partial wrapped record as a valid row", () => {
  const parsed = parseEvoResultsPaste("03/10/2026\tEvent\tDressage\tNicole");
  assert.equal(parsed.rows.length, 0);
  assert.ok(parsed.warnings.length > 0);
});

test("accepts copied column headings, wrapped judge detail and max two-decimal score", () => {
  const pasted = [
    "Date\tEvent\tDiscipline\tRider\tClass\tLevel/Type\tPlace\tResult\tDetail",
    "03/10/2026\tDCD Kiwi Arena Rakes Premier League Show 2026\tDressage\tNicole Bours\t701\tLevel 7\t4\t64.7\tJ1:65.1/3",
    "J2:64.9/4 J3:64.2/4",
    "03/10/2026\tDCD Kiwi Arena Rakes Premier League Show 2026\tDressage\tNicole Bours\t702\tElementary (L3)\t4\t64,25\tJ1:64.25/4",
  ].join("\n");
  const parsed = parseEvoResultsPaste(pasted);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].judges, "J1:65.1 J2:64.9 J3:64.2");
  assert.equal(parsed.rows[1].percent, 64.25);
  assert.equal(parsed.rows[1].rider, "Nicole Bours");
});
