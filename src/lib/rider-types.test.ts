import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSnapshots, snapshotFromStorage, snapshotIsEmpty } from "./rider-types.ts";

test("reads the zustand persist envelope and drops official rows", () => {
  const raw = JSON.stringify({
    state: {
      done: { a: true },
      scores: [
        { id: "evo-1", official: true, test: "2B", percent: 60, notes: "", showId: "past" },
        { id: "1", test: "2B", percent: 64, notes: "", showId: "bop" },
      ],
      notes: [{ id: "n", date: "2026-10-01", text: "hi" }],
      review: [],
    },
    version: 0,
  });
  const s = snapshotFromStorage(raw)!;
  assert.equal(s.scores.length, 1);
  assert.equal(s.notes.length, 1);
  assert.equal(snapshotIsEmpty(s), false);
  assert.equal(snapshotFromStorage("not json"), null);
});

test("merge is a union that never drops rows", () => {
  const a = { done: { x: true }, pack: {}, scores: [{ id: "1", test: "2B", percent: 64, notes: "", showId: "s" }], notes: [], review: [] };
  const b = { done: { y: true }, pack: { p: true }, scores: [{ id: "2", test: "2C", percent: 65, notes: "", showId: "s" }], notes: [{ id: "n", date: "", text: "t" }], review: [] };
  const m = mergeSnapshots(a, b);
  assert.deepEqual(m.scores.map((s) => s.id), ["1", "2"]);
  assert.deepEqual(m.done, { x: true, y: true });
  assert.equal(m.notes.length, 1);
  assert.equal(m.pack.p, true);
});
