import assert from "node:assert/strict";
import { test } from "node:test";
import { summariseKeptScores } from "./result-summary.ts";

test("kept scores summarise best, worst and average per class", () => {
  const rows = summariseKeptScores([
    { test: "Novice (L2) · 201", level: "Novice (L2)", percent: 64.6, status: "ok" },
    { test: "Novice (L2) · 201", level: "Novice (L2)", percent: 65.5, status: "ok" },
    { test: "Novice (L2) · 203", level: "Novice (L2)", percent: 62.8, status: "ok" },
    { test: "Novice (L2) · 204", level: "Novice (L2)", percent: 64.8, status: "ok" },
    { test: "Novice (L2) · 201", level: "Novice (L2)", percent: 0, status: "E" },
    { test: "2B", level: "Level 2", percent: 66.2, status: "ok" },
  ]);
  const byLabel = new Map(rows.map((row) => [row.label, row]));
  assert.equal(byLabel.get("201")?.best, 65.5);
  assert.equal(byLabel.get("201")?.worst, 64.6);
  assert.equal(byLabel.get("201")?.count, 2);
  assert.ok(Math.abs((byLabel.get("201")?.average ?? 0) - 65.05) < 0.001);
  assert.equal(byLabel.get("203")?.level, "Novice (L2)");
  assert.equal(byLabel.get("2B")?.best, 66.2);
  assert.equal(
    rows.some((row) => row.label === "201" && row.count === 3),
    false,
  );
});
