import { test } from "node:test";
import assert from "node:assert/strict";
import { evoDedupeKey, normaliseEsnz, parseDate, parseEvoResultsCsv, parsePercent } from "./evo-csv.ts";

test("comma CSV with common headers", () => {
  const csv = `Place,Rider,Horse,ESNZ No,Class,Test,Percentage,Date,Event
1,Jane Smith,Bella Rosa,12345,Class 12 Level 2,2B,"68.5%",12/03/2027,Taupō Premier League
2,"O'Neil, Sam",Rua (NZ),,Class 12 Level 2,2B,E,12/03/2027,Taupō Premier League
`;
  const r = parseEvoResultsCsv(csv);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].rider, "Jane Smith");
  assert.equal(r.rows[0].esnz, "12345");
  assert.equal(r.rows[0].percent, 68.5);
  assert.equal(r.rows[0].date, "2027-03-12");
  assert.equal(r.rows[0].place, "1");
  assert.equal(r.rows[1].status, "E");
  assert.equal(r.rows[1].percent, null);
  assert.equal(r.rows[1].rider, "O'Neil, Sam");
});

test("semicolon, BOM, preamble, first/last names, decimal comma, judge columns", () => {
  const csv = "\uFEFFEvent: Horowhenua Winter Series\nExported 05/11/2026\n\nPos;First Name;Surname;Horse Name;Horse Reg;J1 %;J2 %;Final %\n3;Alex;Ngata;Kōwhai;ESNZ-0042;64,2;65,8;65,0\n4;Kim;Lee;Tui;;63;64;\n";
  const r = parseEvoResultsCsv(csv);
  assert.equal(r.delimiter, ";");
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].rider, "Alex Ngata");
  assert.equal(r.rows[0].horse, "Kōwhai");
  assert.equal(r.rows[0].percent, 65);
  assert.equal(r.rows[0].event, "Horowhenua Winter Series");
  assert.match(r.rows[0].judges, /J1 %:64.2/);
  assert.equal(r.rows[1].percent, 63.5, "falls back to judge average");
  assert.equal(normaliseEsnz(r.rows[0].esnz), "42");
});

test("tab-separated and quoted newlines", () => {
  const csv = 'Competitor\tMount\tScore\tNotes\n"Pat\nQuinn"\tStar\t70.125\tgood\n';
  const r = parseEvoResultsCsv(csv);
  assert.equal(r.delimiter, "\t");
  assert.equal(r.rows[0].horse, "Star");
  assert.equal(r.rows[0].percent, 70.125);
  assert.equal(r.rows[0].raw.Notes, "good");
});

test("warnings when columns are missing", () => {
  const r = parseEvoResultsCsv("Rider,Comment\nA,B\n");
  assert.ok(r.warnings.some((w) => /horse/i.test(w)));
});

test("helpers", () => {
  assert.deepEqual(parsePercent("WD"), { percent: null, status: "WD" });
  assert.deepEqual(parsePercent("Ret"), { percent: null, status: "WD" });
  assert.equal(parsePercent("66.20 %").percent, 66.2);
  assert.equal(parseDate("2026-05-10"), "2026-05-10");
  assert.equal(parseDate("10 May 2026"), "2026-05-10");
  assert.equal(parseDate("May 10, 2026"), "2026-05-10");
  assert.equal(parseDate("1/2/26"), "2026-02-01");
  assert.equal(
    evoDedupeKey({ event: "Taupō PL", date: "2027-03-12", className: "Class 12", test: "2B", percent: 68.5, status: "ok" }),
    evoDedupeKey({ event: "taupo pl", date: "2027-03-12", className: "class 12", test: "2B", percent: 68.5, status: "ok" }),
  );
});
