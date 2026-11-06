import assert from "node:assert/strict";
import test from "node:test";
import { SET_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw } from "./esnz-tests.ts";
import {
  BOT,
  TOP,
  M_PX,
  CX,
  halfArc,
  linePath,
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

function reflectedX(path: string) {
  return path
    .replace(
      /([MLQ]) ((?:-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? ?)+)/g,
      (_part, command: string, coords: string) =>
        `${command} ${coords
          .trim()
          .split(" ")
          .map(Number)
          .map((n: number, i: number) => (i % 2 === 0 ? 2 * CX - n : n))
          .map((n: number) => n.toFixed(1))
          .join(" ")} `,
    )
    .trimEnd()
    .replace(
      /A ([\d.]+) ([\d.]+) 0 0 ([01])/g,
      (_arc, rx, ry, sweep) => `A ${rx} ${ry} 0 0 ${1 - Number(sweep)}`,
    );
}

test("2A movements 2 and 3 are exact vertical-axis mirrors", () => {
  const [, left, right] = SET_TESTS[0].movements;
  const approach = left.draw[0];
  const returnHalf = left.draw[1];
  assert.ok(approach.t === "line" && returnHalf.t === "return-half");
  assert.equal(reflectedX(linePath(approach.pts)), linePath(["C", "M", "R", "B"]));
  assert.equal(
    reflectedX(returningHalfArc(returnHalf.from, returnHalf.to, returnHalf.bulge)),
    returningHalfArc("B", "M", "A"),
  );
});

test("matching left/right movement pairs are geometrically symmetrical", () => {
  const mirror: Record<string, string> = {
    A: "A",
    C: "C",
    I: "I",
    E: "B",
    F: "K",
    H: "M",
    K: "F",
    P: "V",
    R: "S",
    S: "R",
    V: "P",
    B: "E",
    M: "H",
  };
  const pairs = [
    [1, 9, 14],
    [1, 11, 16],
    [2, 3, 14],
    [2, 7, 18],
    [2, 8, 19],
  ] as const;
  for (const [testIndex, leftNumber, rightNumber] of pairs) {
    const a: Draw[] = SET_TESTS[testIndex].movements[leftNumber - 1].draw;
    const b: Draw[] = SET_TESTS[testIndex].movements[rightNumber - 1].draw;
    assert.deepEqual(
      a,
      b.map((d) => {
        if (d.t === "line") return { ...d, pts: d.pts.map((p) => mirror[p]) };
        if (d.t === "diag") return { ...d, from: mirror[d.to], to: mirror[d.from] };
        if (d.t === "yield" || d.t === "loop")
          return { ...d, from: mirror[d.from], to: mirror[d.to] };
        if ("at" in d) return { ...d, at: d.at === "I" ? "I" : mirror[d.at] };
        return d;
      }),
      `2${"ABC"[testIndex]} movements ${leftNumber}/${rightNumber}`,
    );
  }
});
