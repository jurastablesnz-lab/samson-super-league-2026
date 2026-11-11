import assert from "node:assert/strict";
import { test } from "node:test";
import { inferDressageTest } from "./dressage-test.ts";

const samson = [
  ["2026-10-24", 64.6, "3", "201", null],
  ["2026-10-24", 64.8, "13", "204", null],
  ["2026-10-24", 62.8, "16", "203", null],
  ["2026-05-10", 58.3, "5", "13", "Medium TOC"],
  ["2025-10-04", 65.5, "5", "201", "2C"],
  ["2025-10-04", 62.7, "11", "202", "2B Super 5"],
  ["2025-08-31", 64.3, "3", "204", "2B"],
  ["2025-08-31", 61, "4", "203", "2A"],
  ["2023-09-17", 63.1, "4", "9", "2A"],
  ["2023-05-27", 65.3, "4", "202", "2B"],
  ["2023-05-27", 64.7, "3", "203", "2C"],
  ["2023-05-27", 64.8, "5", "201", "2A"],
  ["2023-05-07", 66.2, "5", "12", "2B"],
  ["2023-05-07", 63.7, "7", "11", null],
  ["2023-02-12", 59.6, "8", "10", "2C"],
  ["2023-02-12", 62.9, "9", "9", "2B"],
  ["2021-06-13", 60.6, "8", "8", "2C"],
  ["2021-06-13", 62.2, "9", "7", "2B"],
  ["2021-05-29", 64, "4", "14", "1D"],
  ["2021-05-29", 65.4, "5", "13", "1B"],
  ["2021-05-29", 65.6, "7", "11", "1A"],
  ["2021-05-29", 64.5, "11", "12", "1C"],
  ["2021-05-09", 64.6, "5", "7", "2A"],
  ["2021-05-09", 64.1, "12", "8", "2B"],
] as const;

test("recorded results name the test, and unmatched class numbers stay blank", () => {
  for (const [date, percent, place, klass, expected] of samson) {
    assert.equal(
      inferDressageTest({
        date,
        percent,
        place,
        test: `Novice (L2) · ${klass}`,
      }),
      expected,
      `${date} class ${klass}`,
    );
  }
  assert.equal(
    inferDressageTest({ date: "2026-11-01", percent: 60, place: "1", test: "2B" }),
    "2B",
  );
  assert.equal(
    inferDressageTest({ date: "2026-10-24", percent: 64.6, place: "3", test: "201" }),
    null,
    "a bare class number is not treated as test A",
  );
});
