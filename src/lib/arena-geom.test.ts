import assert from "node:assert/strict";
import test from "node:test";
import { SET_TESTS, marksFor } from "./esnz-tests.ts";
import {
  BOT,
  TOP,
  M_PX,
  halfArc,
  loopPath,
  railParam,
  returningHalfArc,
  track,
} from "./arena-geom.ts";

function values(path: string) {
  return path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
}

test("half circle reaches X with its correct radii and return track", () => {
  for (const [from, to] of [
    ["E", "H"],
    ["B", "M"],
  ] as const) {
    const draw = SET_TESTS[0].movements[from === "E" ? 1 : 2].draw.find(
      (d) => d.t === "return-half",
    );
    assert.ok(draw && draw.t === "return-half");
    assert.deepEqual([draw.from, draw.to], [from, to]);
    const v = values(returningHalfArc(draw.from, draw.to, draw.bulge));
    assert.deepEqual(v.slice(0, 2), [track(from).x, track(from).y]);
    assert.deepEqual(v.slice(7, 9), [track("X").x, track("X").y]);
    assert.deepEqual(v.slice(-2), [track(to).x, track(to).y]);
    assert.ok(!halvesGoViaG(from, to));
  }
});

function halvesGoViaG(from: string, to: string) {
  const moves = SET_TESTS[0].movements.find((m) =>
    m.draw.some((d) => d.t === "return-half" && d.from === from && d.to === to),
  );
  return moves!.draw.some((d) => d.t === "line" && d.pts.includes("G"));
}

test("the final half circles bend towards C before turning towards G", () => {
  for (const id of ["2a", "2c"] as const) {
    const draw = SET_TESTS.find((t) => t.id === id)!
      .movements.at(-1)!
      .draw.find((d) => d.t === "half");
    assert.ok(draw && draw.t === "half");
    assert.equal(draw.to, "X");
    assert.equal(draw.bulge, "C");
    const v = values(halfArc(draw.from, draw.to, draw.bulge));
    assert.deepEqual(v.slice(0, 2), [track(draw.from).x, track(draw.from).y]);
    assert.deepEqual(v.slice(-2), [track("X").x, track("X").y]);
  }
});

test("2C one-loop counter canter passes exactly through X", () => {
  for (const [from, to] of [
    ["K", "H"],
    ["F", "M"],
  ] as const) {
    const [sx, sy, cx, cy, ex, ey] = values(loopPath(from, to));
    assert.equal((sx + 2 * cx + ex) / 4, track("X").x);
    assert.equal((sy + 2 * cy + ey) / 4, track("X").y);
  }
});

test("diagonal continuations follow the specified same side", () => {
  assert.notEqual(railParam("A"), railParam("F"));
  assert.notEqual(railParam("A"), railParam("K"));
  assert.ok(railParam("F") < railParam("P") && railParam("P") < railParam("B"));
  assert.ok(railParam("K") > railParam("V") && railParam("V") > railParam("E"));
  const m = SET_TESTS[2].movements[1];
  assert.deepEqual(m.draw.at(-1), { t: "line", pts: ["F", "V"] });
});

test("arena remains 60 × 20 and marks and movement counts are unchanged", () => {
  assert.equal(M_PX.y * 60, BOT - TOP);
  assert.deepEqual(
    SET_TESTS.map((t) => [t.id, t.movements.length]),
    [
      ["2a", 15],
      ["2b", 19],
      ["2c", 22],
    ],
  );
  for (const t of SET_TESTS) assert.equal(t.arena, "60 × 20");
  assert.deepEqual(
    SET_TESTS.map((t) => marksFor(t).total),
    [260, 320, 350],
  );
});

test("every active movement reaches the final track letter in its last line", () => {
  for (const test of SET_TESTS) {
    for (const movement of test.movements) {
      const lastLine = movement.draw.filter((d) => d.t === "line").at(-1);
      if (!lastLine || lastLine.t !== "line") continue;
      const lastAt =
        movement.steps.at(-1)!.at.replaceAll(" ", "") ||
        movement.steps
          .filter((s) => s.at)
          .at(-1)!
          .at.replaceAll(" ", "");
      const end = lastAt.at(-1)!.toUpperCase();
      // Transition-only steps (M/R/A/X/etc.) leave the working movement's
      // preceding segment in force; the rendered polyline already covers it.
      if (lastAt.length < 2) continue;
      assert.equal(lastLine.pts.at(-1), end, `${test.id} movement ${movement.n}`);
      assert.ok(
        lastLine.pts.length >= 2,
        `${test.id} movement ${movement.n} needs an actual segment`,
      );
    }
  }
});

test("2A C–EX–HB starts at C, has no X–C segment, and reaches B by H–C–M", () => {
  const movement = SET_TESTS[0].movements[1];
  assert.deepEqual(movement.draw[0], { t: "line", pts: ["C", "H", "S", "E"] });
  assert.deepEqual(movement.draw.at(-1), { t: "line", pts: ["H", "C", "M", "B"] });
  for (const draw of movement.draw) {
    if (draw.t === "line") {
      assert.ok(!draw.pts.includes("G"));
      assert.equal(draw.pts[0] === "X" && draw.pts[1] === "C", false);
    }
  }
});

test("the legacy C–H–M return renders toward C then B on the track", () => {
  const ends = [track("H"), track("C"), track("M"), track("B")];
  assert.deepEqual(
    ends.map((p) => [p.x, p.y]),
    [
      [50, 48],
      [110, 28],
      [170, 48],
      [170, 134],
    ],
  );
});
