import assert from "node:assert/strict";
import { test } from "node:test";
import { groupResults } from "./result-summary.ts";

test("Level 2 view groups 2A, 2B, 2C and MFS, and keeps other levels separate", () => {
  const board = groupResults(
    [
      {
        id: "a",
        date: "2025-08-31",
        showName: "Wairarapa",
        test: "Novice (L2) · 203",
        level: "Novice (L2)",
        percent: 61,
        place: "4",
        status: "ok",
      },
      {
        id: "b",
        date: "2025-10-04",
        showName: "DCD",
        test: "Novice (L2) · 202",
        level: "Novice (L2)",
        percent: 62.7,
        place: "11",
        status: "ok",
      },
      {
        id: "c",
        date: "2023-05-27",
        showName: "DCD",
        test: "Novice (L2) · 202",
        level: "Novice (L2)",
        percent: 65.3,
        place: "4",
        status: "ok",
      },
      {
        id: "d",
        date: "2026-10-24",
        showName: "BOP",
        test: "Novice (L2) · 201",
        level: "Novice (L2)",
        percent: 64.6,
        place: "3",
        status: "ok",
      },
      {
        id: "e",
        date: "2021-05-29",
        showName: "DCD",
        test: "Preliminary (L1) · 11",
        level: "Preliminary (L1)",
        percent: 65.6,
        place: "7",
        status: "ok",
      },
      {
        id: "f",
        date: "2026-05-10",
        showName: "HDG",
        test: "Medium (L4) · 13",
        level: "Medium (L4)",
        percent: 58.3,
        place: "5",
        status: "ok",
      },
    ],
    "Level 2",
  );
  assert.deepEqual(
    board.primary.groups.map((group) => group.label),
    ["2A", "2B", "2C", "MFS"],
  );
  const twoA = board.primary.groups[0];
  const twoB = board.primary.groups[1];
  assert.equal(twoA.count, 1);
  assert.equal(twoA.best, 61);
  assert.equal(twoB.count, 2);
  assert.equal(twoB.best, 65.3);
  assert.equal(twoB.worst, 62.7);
  assert.equal(twoB.rides[0].detail, "Super 5");
  assert.equal(board.primary.groups[3].count, 0);
  assert.equal(board.unassigned.length, 1);
  assert.equal(board.unassigned[0].id, "d");
  assert.deepEqual(board.others.map((section) => section.section).sort(), [
    "Medium",
    "Preliminary",
  ]);
});
