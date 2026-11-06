import assert from "node:assert/strict";
import test from "node:test";
import { SET_TESTS, SET_4_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw } from "./esnz-tests.ts";
import {
  BOT,
  TOP,
  LEFT,
  RIGHT,
  M_PX,
  isRail,
  circleCenter,
  CX,
  CORNER_RX,
  CORNER_RY,
  halfArc,
  linePath,
  loopPath,
  railParam,
  lateralWork,
  lateralWorkPath,
  lateralWorkPoints,
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

test("rail hatches are evenly spaced, large and on their segment", () => {
  for (const kind of ["shoulder-in", "travers", "half-pass", "leg-yield"] as const) {
    const ticks = lateralWork(
      [
        { x: 85, y: 28 },
        { x: 85, y: 128 },
      ],
      kind,
      "right",
    );
    assert.ok(ticks.length >= (kind === "half-pass" || kind === "leg-yield" ? 2 : 4));
    const interval = ticks[1].centre.y - ticks[0].centre.y;
    for (let i = 2; i < ticks.length; i++)
      assert.ok(Math.abs(ticks[i].centre.y - ticks[i - 1].centre.y - interval) < 1e-8);
    for (const t of ticks) {
      assert.equal(t.centre.x, 85);
      assert.ok(t.centre.y > TOP && t.centre.y < 128);
      assert.ok(Math.hypot(t.nose.x - t.from.x, t.nose.y - t.from.y) >= 14);
    }
  }
});
test("body angles remain 30 degrees for rail work and 45 degrees for diagonals", () => {
  const acute = (t: ReturnType<typeof lateralWork>[number]) =>
    Math.abs(
      Math.atan2(
        Math.sin(Math.atan2(t.nose.y - t.from.y, t.nose.x - t.from.x) + Math.PI / 2),
        Math.cos(Math.atan2(t.nose.y - t.from.y, t.nose.x - t.from.x) + Math.PI / 2),
      ),
    );
  for (const [kind, angle] of [
    ["shoulder-in", Math.PI / 6],
    ["travers", Math.PI / 6],
    ["half-pass", Math.PI / 4],
    ["leg-yield", Math.PI / 4],
  ] as const)
    for (const direction of ["left", "right"] as const) {
      const ticks = lateralWork(
        [
          { x: 85, y: 170 },
          { x: 85, y: 70 },
        ],
        kind,
        direction,
      );
      assert.ok(
        ticks.every((t) => Math.abs(acute(t) - angle) < 1e-8),
        `${kind} ${direction}`,
      );
      assert.ok(
        ticks.every((t) => t.nose.y < t.from.y),
        `${kind} ${direction} forward`,
      );
    }
});

test("rail work retains its full-angle body axis on the inbounds side of the rail", () => {
  for (const [from, to, kind, direction] of [
    ["K", "E", "shoulder-in", "right"],
    ["K", "E", "travers", "right"],
    ["F", "B", "shoulder-in", "left"],
    ["F", "B", "renvers", "left"],
  ] as const) {
    for (const t of lateralWork([track(from), track(to)], kind, direction)) {
      assert.ok(Math.abs(Math.hypot(t.nose.x - t.from.x, t.nose.y - t.from.y) - 16) < 1e-8);
      const expected = kind === "shoulder-in" ? t.from : t.from;
      assert.equal(expected.x, track(from).x, `${kind} outward body end stays on rail`);
      assert.ok(t.nose.y < t.from.y, `${kind} points forward`);
      const angle = Math.abs(Math.atan2(t.nose.x - t.from.x, t.from.y - t.nose.y));
      assert.ok(Math.abs(angle - Math.PI / 6) < 1e-8, `${kind} is not clipped vertical`);
    }
  }
});

test("every set-test and freestyle lateral overlay matches its sheet letters and stays in-bounds", async () => {
  const { MFS_FLOOR } = await import("./freestyle-floor.ts");
  const audited: string[] = [];
  const expected = [
    "2B/3",
    "2B/5",
    "2C/3",
    "2C/14",
    "4A/4",
    "4A/6",
    "4A/9",
    "4A/11",
    "4A/15",
    "4A/18",
    "4B/3",
    "4B/8",
    "4B/11",
    "4B/17",
    "4C/2",
    "4C/3",
    "4C/4",
    "4C/7",
    "4C/15",
    "4C/18",
    "Level 2 musical freestyle/7",
    "Level 2 musical freestyle/14",
  ];
  let tickCount = 0;
  for (const test of [...SET_TESTS, ...SET_4_TESTS, MFS_FLOOR]) {
    for (const movement of test.movements)
      if (movement.lateral) {
        const label = "short" in test ? test.short : test.name;
        const id = `${label}/${movement.n}`;
        audited.push(id);
        const ids = movement.lateral.line
          ? movement.lateral.pts
          : [movement.lateral.from, movement.lateral.to];
        const written = movement.steps
          .filter((s) => /shoulder-in|travers|renvers|half pass|leg yield/i.test(s.do))
          .flatMap((s) => s.at.split(" "));
        assert.deepEqual(ids, written, `${id}: overlay endpoints match the test sheet`);
        assert.equal(ids.length, 2);
        assert.deepEqual(
          lateralWorkPoints(ids),
          [track(ids[0]), track(ids[1])],
          `${id}: no perimeter-wrapped intermediate path`,
        );
        const ticks = lateralWork(
          lateralWorkPoints(ids),
          movement.lateral.kind,
          movement.lateral.direction,
        );
        const a = track(ids[0]),
          b = track(ids[1]),
          length = Math.hypot(b.x - a.x, b.y - a.y);
        assert.ok(ticks.length >= 2, `${id} overlays exist`);
        for (const t of ticks) {
          tickCount++;
          const dx = t.nose.x - t.from.x,
            dy = t.nose.y - t.from.y;
          assert.ok(
            dx * (b.x - a.x) + dy * (b.y - a.y) > 0,
            `${id}: hatch nose leads along travel`,
          );
          const travelAngle = Math.atan2(b.y - a.y, b.x - a.x);
          const acute = Math.abs(
            Math.atan2(
              Math.sin(Math.atan2(dy, dx) - travelAngle),
              Math.cos(Math.atan2(dy, dx) - travelAngle),
            ),
          );
          assert.ok(
            Math.abs(
              acute -
                (movement.lateral.kind === "half-pass" || movement.lateral.kind === "leg-yield"
                  ? Math.PI / 4
                  : Math.PI / 6),
            ) < 1e-8,
            `${id}: full, unclipped body angle`,
          );
          for (const p of [t.centre, t.from, t.to, t.nose, t.tip]) {
            assert.ok(
              p.x >= LEFT && p.x <= RIGHT && p.y >= TOP && p.y <= BOT,
              `${id}: tick outside arena`,
            );
            if (p.y < TOP + CORNER_RY || p.y > BOT - CORNER_RY) {
              const cx = p.x < CX ? LEFT + CORNER_RX : RIGHT - CORNER_RX;
              const cy = p.y < CX ? TOP + CORNER_RY : BOT - CORNER_RY;
              if (p.x < LEFT + CORNER_RX || p.x > RIGHT - CORNER_RX)
                assert.ok(
                  ((p.x - cx) / CORNER_RX) ** 2 + ((p.y - cy) / CORNER_RY) ** 2 <= 1.000001,
                  `${id}: outside rounded arena corner`,
                );
            }
          }
          const cross = (t.centre.x - a.x) * (b.y - a.y) - (t.centre.y - a.y) * (b.x - a.x);
          const dot = (t.centre.x - a.x) * (b.x - a.x) + (t.centre.y - a.y) * (b.y - a.y);
          assert.ok(Math.abs(cross) < 1e-7, `${id}: tick centre off ${ids.join("-")}`);
          assert.ok(dot >= -1e-7 && dot <= length * length + 1e-7, `${id}: tick centre past end`);
          if (movement.lateral.kind === "half-pass" || movement.lateral.kind === "leg-yield")
            for (const p of [t.from, t.to, t.nose, t.tip]) {
              const pd = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
              assert.ok(
                pd >= -1e-7 && pd <= length * length + 1e-7,
                `${id}: hatch extends beyond lateral endpoint`,
              );
            }
          assert.ok(
            t.centre.x >= Math.min(a.x, b.x) && t.centre.x <= Math.max(a.x, b.x),
            `${id}: tick centre out of x interval`,
          );
          assert.ok(
            t.centre.y >= Math.min(a.y, b.y) && t.centre.y <= Math.max(a.y, b.y),
            `${id}: tick centre out of y interval`,
          );
          if (movement.lateral.kind !== "half-pass" && movement.lateral.kind !== "leg-yield")
            assert.equal(t.centre.x, a.x, `${id}: rail hatch remains on rail`);
        }
      }
  }
  assert.deepEqual(
    audited,
    expected,
    "exact lateral movement audit covers all requested tests and freestyle",
  );
  assert.ok(tickCount > 100);
});
