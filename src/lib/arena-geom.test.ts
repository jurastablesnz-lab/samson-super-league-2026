import assert from "node:assert/strict";
import test from "node:test";
import { SET_TESTS, SET_4_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw } from "./esnz-tests.ts";
import {
  BOT,
  TOP,
  LEFT,
  M_PX,
  isRail,
  circleCenter,
  CX,
  halfArc,
  linePath,
  loopPath,
  railParam,
  lateralWork,
  lateralWorkPath,
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
      /(x[12]|cx)="([\d.]+)"/g,
      (_m, attr, value) => `${attr}="${(2 * CX - Number(value)).toFixed(1)}"`,
    )
    .replace(
      /A ([\d.]+) ([\d.]+) 0 0 ([01])/g,
      (_arc, rx, ry, sweep) => `A ${rx} ${ry} 0 0 ${1 - Number(sweep)}`,
    );
}

test("2A movements 2 and 3 are exact vertical-axis mirrors", () => {
  const [, left] = SET_TESTS[0].movements;
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

test("2C movement 4 is a left-sided 10m circle tangent at I and reaching S", () => {
  const movement = SET_TESTS[2].movements[3];
  assert.deepEqual(movement.draw[0], { t: "circle", at: "I", m: 10, side: "left" });
  const center = circleCenter("I", 5, "left");
  const rx = 5 * M_PX.x;
  assert.deepEqual(center, { x: CX - rx, y: track("I").y });
  assert.equal(center.x + rx, track("I").x, "rightmost point starts/ends at I");
  assert.equal(center.x - rx, LEFT, "leftmost point reaches the track at S");
  assert.equal(track("S").y, center.y);
  assert.deepEqual(movement.draw[1], { t: "line", pts: ["I", "G", "C", "M", "R", "B"] });
  assert.deepEqual(circleCenter("I", 5, "right"), { x: CX + rx, y: track("I").y });
});

test("2C movement 15 is a right-sided 10m circle tangent at I and reaching R", () => {
  const movement = SET_TESTS[2].movements[14];
  assert.deepEqual(movement.draw[0], { t: "circle", at: "I", m: 10, side: "right" });
  const center = circleCenter("I", 5, "right");
  const rx = 5 * M_PX.x;
  assert.deepEqual(center, { x: CX + rx, y: track("I").y });
  assert.equal(center.x - rx, track("I").x, "leftmost point starts/ends at I");
  assert.equal(center.x + rx, track("R").x, "rightmost point reaches the track at R");
  assert.equal(track("R").y, center.y);
  assert.deepEqual(movement.draw[1], { t: "line", pts: ["I", "G", "C", "M"] });
});

test("Medium 4 has all set tests, correct numbering, coefficients and marks", () => {
  assert.deepEqual(
    SET_4_TESTS.map((t) => [t.id, t.movements.length]),
    [
      ["4a", 20],
      ["4b", 21],
      ["4c", 22],
    ],
  );
  assert.deepEqual(
    SET_4_TESTS.map((t) => t.movements.filter((m) => m.coeff === 2).map((m) => m.n)),
    [
      [12, 13, 15, 18],
      [3, 7, 8, 11],
      [10, 12],
    ],
  );
  for (const test of SET_4_TESTS)
    test.movements.forEach((m, i) => {
      assert.equal(m.n, i + 1);
      for (const step of m.steps) {
        assert.notEqual(step.at, "at");
        assert.notEqual(step.do, "do");
        assert.ok(step.do.length > 2);
      }
    });
  assert.deepEqual(
    [TEST("4a", 12), TEST("4a", 13), TEST("4a", 15), TEST("4a", 18), TEST("4a", 19)].map(
      (m) => m.coeff ?? 1,
    ),
    [2, 2, 2, 2, 1],
  );
});
function TEST(id: string, n: number) {
  const m = SET_4_TESTS.find((t) => t.id === id)?.movements[n - 1];
  assert.ok(m);
  return m;
}

test("Medium 4 yields reach the side and every track segment is sampled", () => {
  for (const test of SET_4_TESTS)
    for (const m of test.movements)
      for (const d of m.draw)
        if (d.t === "line") {
          const path = linePath(d.pts);
          assert.ok(path.length > 0, `${test.id}/${m.n}`);
          if (d.pts.length === 2) {
            const a = d.pts[0],
              b = d.pts[1];
            if (isRail(a) && isRail(b))
              assert.ok(path.split(" L ").length > 2, `${test.id}/${m.n} ${a}-${b}`);
          }
        }
});
test("Medium 4B 20m half circle crosses X between B and E", () => {
  assert.deepEqual(TEST("4b", 16).draw[0], { t: "arc", from: "B", to: "E", bulge: "C" });
  assert.deepEqual(TEST("4b", 16).draw[1], { t: "line", pts: ["E", "V", "K", "A"] });
});
test("Medium 4C half circles reach X and the correct track, continuing to FAK", () => {
  assert.deepEqual(TEST("4c", 2).draw.at(-1), { t: "half", from: "E", to: "X", bulge: "C" });
  assert.deepEqual(TEST("4c", 3).draw[0], { t: "half", from: "X", to: "B", bulge: "C" });
  assert.deepEqual(TEST("4c", 3).draw[1], { t: "line", pts: ["B", "P", "F", "A", "K"] });
});
test("Medium 4C half passes lead into the correct R and S changes", () => {
  assert.deepEqual(TEST("4c", 15).draw, [
    { t: "line", pts: ["A", "D"] },
    { t: "yield", from: "D", to: "B" },
    { t: "line", pts: ["B", "R"] },
  ]);
  assert.equal(TEST("4c", 16).draw.at(-1)?.t, "change");
  assert.deepEqual(TEST("4c", 18).draw, [
    { t: "line", pts: ["A", "D"] },
    { t: "yield", from: "D", to: "E" },
    { t: "line", pts: ["E", "S"] },
  ]);
  assert.equal(TEST("4c", 19).draw.at(-1)?.t, "change");
});
test("Medium 4B final turns and changes are on the correct centre markers", () => {
  assert.deepEqual(TEST("4b", 10).draw, [{ t: "line", pts: ["F", "A", "D", "L"] }]);
  assert.deepEqual(TEST("4b", 14).draw.at(-1), { t: "line", pts: ["F", "A", "K", "V", "L"] });
  assert.deepEqual(TEST("4b", 17).draw, [
    { t: "line", pts: ["A", "L"] },
    { t: "yield", from: "L", to: "S" },
  ]);
  assert.ok(TEST("4b", 15).draw.some((d) => d.t === "change"));
});

test("all Medium final track and centreline segments are included", () => {
  const expected: Record<string, [string, string[]]> = {
    "4a:3": ["diag", ["H", "P"]],
    "4c:18": ["line", ["E", "S"]],
    "4b:10": ["line", ["F", "A", "D", "L"]],
  };
  for (const test of SET_4_TESTS)
    for (const m of test.movements) {
      assert.ok(m.draw.length > 0, `${test.id}/${m.n}`);
      for (const d of m.draw)
        if (d.t === "line") {
          for (let i = 1; i < d.pts.length; i++) {
            const a = d.pts[i - 1],
              b = d.pts[i];
            assert.ok(track(a) && track(b));
            assert.ok(
              !isRail(a) || !isRail(b) || linePath([a, b]).split(" L ").length > 2,
              `${test.id}/${m.n} ${a}-${b}`,
            );
          }
        }
    }
  for (const [key, [kind, points]] of Object.entries(expected)) {
    const [id, n] = key.split(":");
    const m = TEST(id, Number(n));
    assert.ok(
      m.draw.some(
        (d) =>
          d.t === kind &&
          (d.t === "line"
            ? JSON.stringify(d.pts) === JSON.stringify(points)
            : d.t === "diag"
              ? [d.from, d.to].every((v, i) => v === points[i])
              : false),
      ),
    );
  }
});

test("Medium circle endpoints, extended canter and walking turns have exact geometry", () => {
  assert.deepEqual(TEST("4c", 17).draw, [
    { t: "line", pts: ["H", "S", "E", "V"] },
    { t: "line", pts: ["V", "K", "A"] },
  ]);
  assert.deepEqual(TEST("4c", 15).draw.at(-1), { t: "line", pts: ["B", "R"] });
  for (const id of ["4b", "4c"])
    for (const m of SET_4_TESTS.find((t) => t.id === id)!.movements)
      for (const d of m.draw)
        if (d.t === "yield") assert.ok(d.to === "X" || (isRail(d.to) && track(d.to).x !== CX));
  assert.equal(TEST("4b", 4).draw.at(-1)?.t, "half-turn");
  assert.equal(TEST("4b", 5).draw.at(-1)?.t, "half-turn");
  assert.equal(TEST("4c", 11).draw.find((d) => d.t === "rein-back")?.t, "rein-back");
  for (const at of ["E", "B"] as const) {
    const c = circleCenter(at, 5);
    assert.equal(Math.abs(c.x - CX), 5 * M_PX.x);
  }
});

test("adjacent perimeter letters follow rounded corners, including A-F", () => {
  const path = linePath(["A", "F"]);
  const points = Array.from(path.matchAll(/[ML] ([\d.]+) ([\d.]+)/g), (m) => [+m[1], +m[2]]);
  assert.ok(
    points.some(([x, y]) => x > CX + 10 && y > BOT - 10),
    "must include rounded A-F corner",
  );
  assert.ok(Math.max(...points.map((p) => p[0])) > track("A").x + 40, "must cover towards F");
  assert.deepEqual(TEST("4a", 14).draw, [{ t: "line", pts: ["A", "F"] }]);
});

test("lateral work produces even body-axis hatches centred on its path", () => {
  const a = lateralWork(
    [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ],
    "shoulder-in",
    "right",
  );
  assert.ok(a.length >= 5);
  const midpoint = a[Math.floor(a.length / 2)];
  assert.equal(midpoint.centre.x, 0);
  assert.ok(Math.abs(midpoint.centre.y - 50) < 1);
  for (let i = 1; i < a.length; i++)
    assert.ok(Math.abs(a[i].centre.y - a[i - 1].centre.y - 84 / (a.length - 1)) < 1e-8);
  for (const t of a) {
    assert.equal(t.centre.x, 0);
    assert.ok(t.centre.y >= 8 && t.centre.y <= 92);
    assert.ok(Math.abs(Math.hypot(t.nose.x - t.centre.x, t.nose.y - t.centre.y) - 4) < 1e-8);
  }
});
function tickInside(t: ReturnType<typeof lateralWork>[number], leftRail: boolean) {
  return leftRail ? t.nose.x > t.centre.x : t.nose.x < t.centre.x;
}
function angleOf(t: ReturnType<typeof lateralWork>[number]) {
  return Math.atan2(t.to.y - t.from.y, t.to.x - t.from.x);
}
test("lateral types and mirrored diagonals orient the body relative to the arena", () => {
  const k = track("K"),
    si = lateralWork([k, track("E")], "shoulder-in", "right")[0];
  const tr = lateralWork([k, track("E")], "travers", "right")[0];
  assert.ok(si.nose.x > k.x, "shoulder-in right: forehand inside left rail");
  assert.ok(tr.nose.x < k.x, "travers right: forehand stays outside left rail");
  const re = lateralWork([track("F"), track("B")], "renvers", "left")[0];
  assert.ok(re.nose.x < track("F").x, "renvers left: forehand is outside right rail");
  assert.ok(angleOf(si) > -Math.PI / 2 && angleOf(si) < 0);
  assert.ok(angleOf(tr) < -Math.PI / 2 && angleOf(tr) > -Math.PI);
  const mirror = lateralWork([track("F"), track("B")], "shoulder-in", "left")[0];
  assert.ok(Math.abs(si.nose.x - si.centre.x + (mirror.nose.x - mirror.centre.x)) < 1e-8);
  const right = lateralWork([track("L"), track("M")], "leg-yield", "right")[0];
  const left = lateralWork([track("L"), track("H")], "leg-yield", "left")[0];
  assert.ok(
    Math.abs(right.nose.x - right.centre.x + (left.nose.x - left.centre.x)) < 1e-8,
    "mirror lateral displacement",
  );
  assert.ok(
    Math.abs(right.nose.y - right.centre.y - (left.nose.y - left.centre.y)) < 1e-8,
    "same parallel pitch",
  );
  const half = lateralWork([track("L"), track("M")], "half-pass", "right")[0];
  assert.equal(angleOf(half), angleOf(right));
  assert.ok(right.nose.x > CX);
  assert.ok(left.nose.x < CX);
});
test("the rail sampler places hatches on the same rounded rail, clear of corners", () => {
  const a = lateralWorkPath(["C", "H"], "shoulder-in", "right");
  assert.ok(a.split(" M ").length >= 10);
  const points = Array.from(a.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g), (m) => ({
    x: +m[1],
    y: +m[2],
  }));
  assert.ok(points.every((p) => p.x >= LEFT - 4 && p.y >= TOP));
  const cornerMarks = lateralWork([track("C"), track("H")], "shoulder-in", "right");
  assert.ok(cornerMarks.every((t) => t.centre.x >= LEFT && t.centre.y > TOP));
  for (const pair of [
    ["K", "E"],
    ["E", "H"],
    ["F", "B"],
    ["B", "M"],
  ] as const) {
    const isRight = pair[0] === "K" || pair[0] === "E";
    const ticks = lateralWork(
      [track(pair[0]), track(pair[1])],
      "shoulder-in",
      isRight ? "right" : "left",
    );
    assert.ok(ticks.every((t) => tickInside(t, track(pair[0]).x < 110)));
    assert.ok(ticks[0].centre.x === track(pair[0]).x);
    assert.ok(ticks[0].centre.y < track(pair[0]).y && ticks[0].centre.y > track(pair[1]).y);
    assert.ok(lateralWorkPath(pair, "shoulder-in", isRight ? "right" : "left").length > 100);
  }
});
test("all named lateral paths are annotated, without changing their base path", () => {
  const expected: Record<string, number[]> = {
    "2b": [3, 5],
    "2c": [3, 14],
    "4a": [4, 6, 9, 11, 15, 18],
    "4b": [3, 8, 11, 17],
    "4c": [2, 3, 4, 7, 15, 18],
  };
  for (const test of [...SET_TESTS, ...SET_4_TESTS]) {
    assert.deepEqual(
      test.movements.filter((m) => m.lateral).map((m) => m.n),
      expected[test.id] ?? [],
      test.id,
    );
    for (const m of test.movements)
      for (const d of m.draw)
        if (d.t === "yield") {
          assert.match(m.lateral?.kind ?? "", /leg-yield|half-pass/);
          const from = m.lateral?.line ? m.lateral.pts[0] : m.lateral?.from;
          const to = m.lateral?.line ? m.lateral.pts.at(-1) : m.lateral?.to;
          assert.equal(from, d.from);
          assert.equal(to, d.to);
        }
  }
  assert.equal(TEST("4a", 6).lateral?.kind, "travers");
  assert.equal(TEST("4a", 4).lateral?.kind, "shoulder-in");
  assert.equal(TEST("4a", 9).lateral?.direction, "left");
  assert.equal(TEST("4a", 11).lateral?.direction, "left");
  assert.ok(lateralWorkPath(["A", "F"], "shoulder-in", "left").length > 0);
});

test("both freestyle yield paths also get the shared leg-yield body angle", async () => {
  const { MFS_FLOOR } = await import("./freestyle-floor.ts");
  const yields = MFS_FLOOR.movements.filter((m) => m.lateral);
  assert.deepEqual(
    yields.map((m) => m.n),
    [7, 14],
  );
  assert.deepEqual(
    yields.map((m) =>
      !m.lateral || m.lateral.line ? [] : [m.lateral.from, m.lateral.to, m.lateral.direction],
    ),
    [
      ["F", "I", "left"],
      ["K", "I", "right"],
    ],
  );
});

test("each lateral descriptor matches its existing travel path, not the whole movement", () => {
  for (const test of [...SET_TESTS, ...SET_4_TESTS])
    for (const m of test.movements)
      if (m.lateral) {
        const a = m.lateral.line ? m.lateral.pts[0] : m.lateral.from;
        const b = m.lateral.line ? m.lateral.pts.at(-1)! : m.lateral.to;
        assert.ok(
          m.draw.some((d) =>
            d.t === "line"
              ? d.pts.includes(a) && d.pts.includes(b)
              : d.t === "yield" && d.from === a && d.to === b,
          ),
          `${test.id}/${m.n} ${a}-${b}`,
        );
      }
});

test("lateral hatch overlays on tested movement paths retain their original endpoints", () => {
  const covers = [
    ["4a", 4, "K", "E"],
    ["4a", 6, "E", "H"],
    ["4a", 9, "F", "B"],
    ["4a", 11, "B", "M"],
  ] as const;
  for (const [id, n, from, to] of covers) {
    const m = TEST(id, n);
    assert.ok(m.lateral);
    const seg = m.lateral.line ? m.lateral.pts : [m.lateral.from, m.lateral.to];
    assert.deepEqual(seg, [from, to]);
    const points = lateralWorkPath(seg, m.lateral.kind, m.lateral.direction).split(" M ");
    assert.ok(points.length >= 10);
  }
});

test("4A/4 and 4A/6 point the forehand opposite on the left rail", () => {
  const shoulder = TEST("4a", 4).lateral!,
    haunches = TEST("4a", 6).lateral!;
  const a = lateralWork([track("K"), track("E")], shoulder.kind, shoulder.direction)[0];
  const b = lateralWork([track("E"), track("H")], haunches.kind, haunches.direction)[0];
  assert.ok(a.nose.x > track("K").x);
  assert.ok(b.nose.x < track("E").x);
  assert.equal(shoulder.direction, "right");
  assert.equal(haunches.direction, "right");
});
