import assert from "node:assert/strict";
import test from "node:test";
import {
  SET_0_TESTS,
  SET_1_TESTS,
  SET_3_TESTS,
  SET_4_TESTS,
  SET_5_TESTS,
  SET_6_TESTS,
  SET_7_TESTS,
  SET_EVENTING_TESTS,
  SET_G1_TESTS,
  SET_G2_TESTS,
  SET_G3_TESTS,
  SET_G4_TESTS,
  SET_GV_TESTS,
  SET_TESTS,
  marksFor,
} from "./esnz-tests.ts";
import type { Draw, SetTest } from "./esnz-tests.ts";
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
  acrossHalfSide,
  approachTravel,
  arcPath,
  halfArc,
  halfTurnPath,
  haunchesTurn,
  linePath,
  loopOrVeePath,
  samplePath,
  serpentinePath,
  railParam,
  sameSideThroughX,
  veePath,
  withArena,
  lateralWork,
  lateralWorkPoints,
  returningHalfArc,
  track,
  trackThenDiagonal,
  arenaLetters,
  arenaSizeOf,
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

test("2C's final half circle continues toward A, then up the centre line to G", () => {
  const movement = SET_TESTS.find((t) => t.id === "2c")!.movements.at(-1)!;
  const index = movement.draw.findIndex((d) => d.t === "half");
  const draw = movement.draw[index];
  assert.ok(draw && draw.t === "half" && draw.from === "B" && draw.to === "X");
  const prev = movement.draw[index - 1];
  assert.ok(prev && prev.t === "line");
  assert.equal(approachTravel(prev.pts.at(-2), draw.from), "A");
  const crown = arcCrownOf(halfArc(draw.from, draw.to, draw.bulge, draw.hand, "A"));
  assert.ok(crown.y > track("B").y, "the half circle bulges toward A, below the B-E line");
  assert.deepEqual(
    movement.draw.find((d) => d.t === "line" && d.pts[0] === "X"),
    { t: "line", pts: ["X", "G"] },
  );
});

test("half circles onto the centre line follow the direction of travel", () => {
  const centre = new Set(["X", "I", "L", "D", "G"]);
  const sheets = [
    ...SET_0_TESTS,
    ...SET_1_TESTS,
    ...SET_TESTS,
    ...SET_3_TESTS,
    ...SET_4_TESTS,
    ...SET_5_TESTS,
    ...SET_6_TESTS,
    ...SET_7_TESTS,
    ...SET_G1_TESTS,
    ...SET_G2_TESTS,
    ...SET_G3_TESTS,
    ...SET_G4_TESTS,
    ...SET_GV_TESTS,
    ...SET_EVENTING_TESTS,
  ];
  const changed: string[] = [];
  for (const t of sheets) {
    const size = t.arenaSize ?? arenaSizeOf(t.arena);
    withArena(size, () => {
      for (const m of t.movements) {
        m.draw.forEach((d, i) => {
          if (d.t !== "half" && d.t !== "return-half") return;
          const to = d.t === "return-half" ? "X" : d.to;
          if (!centre.has(to)) return;
          if (Math.abs(track(d.from).x - track(to).x) <= Math.abs(track(d.from).y - track(to).y))
            return;
          const prev = m.draw[i - 1];
          const inferred =
            prev?.t === "line" && prev.pts.at(-1) === d.from
              ? approachTravel(prev.pts.at(-2), d.from)
              : undefined;
          const travel = (d.t === "half" ? d.travel : undefined) ?? inferred;
          if (!travel) return;
          const hand = d.t === "half" ? d.hand : undefined;
          const before = arcCrownOf(halfArc(d.from, to, d.bulge, hand));
          const after = arcCrownOf(halfArc(d.from, to, d.bulge, hand, travel));
          const side = (y: number) => (y > track(d.from).y + 2 ? "A" : "C");
          assert.equal(side(after.y), travel, `${t.id}/${m.n} ${d.from} ${travel}`);
          if (side(before.y) !== side(after.y)) changed.push(`${t.id}/${m.n}`);
        });
      }
    });
  }
  assert.deepEqual(changed, ["2c/22", "5a/3", "gv-a/4", "ev-a3/16", "ev-c3/13", "ev-c3/16"]);
});

function isStraightVee(path: string, from: string, to: string) {
  assert.equal(/[QCA]/.test(path), false, `${from} ${to} is curved`);
  const [sx, sy, mx, my, ex, ey] = values(path);
  const at = (id: string, x: number, y: number) => {
    const p = track(id);
    assert.ok(
      Math.abs(x - p.x) < 0.05 && Math.abs(y - p.y) < 0.05,
      `${id} ${x},${y} vs ${p.x},${p.y}`,
    );
  };
  at(from, sx, sy);
  at("X", mx, my);
  at(to, ex, ey);
  assert.equal(values(path).length, 6, `${from} ${to} has an extra bend`);
  assert.ok(Math.abs(mx - sx) > 40, `${from} ${to} point is not out at X`);
}

function arcCrownOf(path: string) {
  const samples = samplePath(path, 24);
  // The crown is the sample farthest from the chord between the ends.
  const a = samples[0];
  const b = samples[samples.length - 1];
  let best = a;
  let bestD = -1;
  for (const p of samples) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
    if (dist > bestD) {
      best = p;
      bestD = dist;
    }
  }
  return best;
}

test("opposite-hand half circles through X form an S", () => {
  const towardC = (from: string, to: string, hand: "left" | "right") => {
    const crown = arcCrownOf(halfArc(from, to, "C", hand));
    return crown.y < track("X").y;
  };
  // B→X left stays toward C; X→E right flips toward A. The red line on 3B/5.
  assert.equal(towardC("B", "X", "left"), true);
  assert.equal(towardC("X", "E", "right"), false);
  assert.equal(towardC("E", "X", "left"), false);
  assert.equal(towardC("X", "B", "right"), true);
  assert.equal(towardC("E", "X", "right"), true);
  assert.equal(towardC("X", "B", "left"), false);
  const sheets = [...SET_3_TESTS, ...SET_4_TESTS, ...SET_5_TESTS, ...SET_EVENTING_TESTS];
  const found: string[] = [];
  for (const t of sheets) {
    const size = t.arenaSize ?? arenaSizeOf(t.arena);
    withArena(size, () => {
      for (const m of t.movements) {
        const halves = m.draw.filter((d) => d.t === "half" && d.hand);
        if (halves.length < 2) continue;
        found.push(`${t.id}/${m.n}`);
        const crowns = halves.map((d) => {
          if (d.t !== "half" || !d.hand) return 0;
          return arcCrownOf(halfArc(d.from, d.to, d.bulge, d.hand)).y - track("X").y;
        });
        assert.ok(crowns[0] * crowns[1] < 0, `${t.id}/${m.n} halves share a side`);
        for (const p of crowns) assert.ok(Math.abs(p) > 8, `${t.id}/${m.n} arc is flat`);
      }
    });
  }
  assert.deepEqual(found, ["3b/5", "3b/10", "5c/4", "5c/10", "ev-a1/2", "ev-c3/5"]);
});

test("centre-line half circles already alternate left then right", () => {
  withArena("40x20", () => {
    const left = arcCrownOf(halfArc("A", "X", "A"));
    const right = arcCrownOf(halfArc("X", "C", "C"));
    assert.ok(left.x < track("X").x, "A to X left bulges to the left long side");
    assert.ok(right.x > track("X").x, "X to C right bulges to the right long side");
  });
});

test("serpentine loops are round, touch the long side, and cross the centre on a straight", () => {
  for (const loops of [3, 4, 5]) {
    for (const size of ["60x20", "40x20"] as const) {
      withArena(size, () => {
        const path = serpentinePath("C", "left", loops);
        assert.equal(path.includes("Q"), false, `${size} ${loops}`);
        const straights = path.match(/L (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g) ?? [];
        assert.equal(straights.length, loops - 1, `${size} ${loops} crossings`);
        for (const straight of straights) {
          const [x, y] = straight.slice(2).split(" ").map(Number);
          const prev = path
            .slice(0, path.indexOf(straight))
            .match(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\s*$/);
          assert.ok(prev);
          const py = Number(prev[2]);
          const px = Number(prev[1]);
          assert.ok(Math.abs(y - py) < 0.05, "crossing is parallel to the short side");
          assert.ok((px - CX) * (x - CX) < 0, "crossing goes over the centre line");
        }
        const samples = samplePath(path, 24);
        const touch = Math.min(...samples.map((p) => p.x));
        assert.ok(Math.abs(touch - LEFT) < 1, `${size} ${loops} touches the left, ${touch}`);
        assert.ok(
          samples.every(
            (p) => p.x >= LEFT - 1 && p.x <= RIGHT + 1 && p.y >= TOP - 1 && p.y <= BOT + 1,
          ),
          `${size} ${loops} left the arena`,
        );
      });
    }
  }
  const three = serpentinePath("C", "right");
  const arc = three.match(/A (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/);
  assert.ok(arc);
  const rx = Number(arc[1]);
  const ry = Number(arc[2]);
  // Three loops of a 60m arena: about a 20m circle, drawn with the arena's scale.
  assert.ok(Math.abs(rx / M_PX.x - 10) < 2.5, `horizontal radius ${rx / M_PX.x}m`);
  assert.ok(Math.abs((ry * 2) / M_PX.y - 20) < 0.5, `loop length ${(ry * 2) / M_PX.y}m`);
});

test("2C counter canter and free walk are straight Vs through X", () => {
  for (const [n, from, to] of [
    [7, "K", "H"],
    [12, "H", "K"],
    [18, "F", "M"],
  ] as const) {
    const draw = SET_TESTS[2].movements[n - 1].draw.find((d) => d.t === "loop");
    assert.ok(draw && draw.t === "loop");
    assert.deepEqual([draw.from, draw.to], [from, to]);
    assert.equal(draw.insetM, undefined);
    isStraightVee(loopOrVeePath(draw.from, draw.to, draw.insetM), from, to);
  }
});

test("same-side H X K and M X F figures are a straight V whose point is X", () => {
  for (const [from, to] of [
    ["H", "K"],
    ["K", "H"],
    ["M", "F"],
    ["F", "M"],
  ] as const) {
    assert.equal(sameSideThroughX(from, to), true);
    const path = veePath(from, to);
    isStraightVee(path, from, to);
    assert.equal(loopOrVeePath(from, to), path);
    assert.equal(linePath([from, "X", to]), path);
  }
  assert.equal(sameSideThroughX("H", "F"), false);
  const across = linePath(["H", "X", "F"]);
  assert.equal(/[QCA]/.test(across), false);
  assert.deepEqual(values(across).slice(2, 4), [track("X").x, track("X").y]);
  assert.deepEqual(values(across).slice(-2), [track("F").x, track("F").y]);
  withArena("40x20", () => {
    isStraightVee(veePath("H", "K"), "H", "K");
    isStraightVee(veePath("M", "F"), "M", "F");
    assert.equal(linePath(["M", "X", "F"]), veePath("M", "F"));
  });
});

test("every H X K style movement reaches X, including 2C and Prelim 1C", () => {
  const sheets: SetTest[] = [
    ...SET_0_TESTS,
    ...SET_1_TESTS,
    ...SET_TESTS,
    ...SET_3_TESTS,
    ...SET_4_TESTS,
    ...SET_5_TESTS,
    ...SET_6_TESTS,
    ...SET_7_TESTS,
    ...SET_G1_TESTS,
    ...SET_G2_TESTS,
    ...SET_G3_TESTS,
    ...SET_G4_TESTS,
    ...SET_GV_TESTS,
    ...SET_EVENTING_TESTS,
  ];
  const found: string[] = [];
  for (const t of sheets) {
    const size = t.arenaSize ?? arenaSizeOf(t.arena);
    withArena(size, () => {
      for (const m of t.movements) {
        for (const step of m.steps) {
          const letters = step.at
            .split(/[\s&]+/)
            .map((tok) => tok.replace(/[^A-Z]/g, ""))
            .filter((tok) => tok.length === 1);
          for (let i = 0; i < letters.length - 2; i++) {
            const [a, mid, b] = [letters[i], letters[i + 1], letters[i + 2]];
            if (mid !== "X" || !sameSideThroughX(a, b)) continue;
            found.push(`${t.id}/${m.n}`);
            const draw = m.draw.find(
              (d: Draw) =>
                (d.t === "loop" && sameSideThroughX(d.from, d.to)) ||
                (d.t === "line" && d.pts.includes(a) && d.pts.includes("X") && d.pts.includes(b)) ||
                (d.t === "diag" && sameSideThroughX(d.from, d.to)),
            );
            assert.ok(draw, `${t.id}/${m.n} has no loop for ${a} X ${b}`);
            assert.equal(draw.t === "loop" ? draw.insetM : undefined, undefined);
            const path =
              draw.t === "loop"
                ? loopOrVeePath(draw.from, draw.to, draw.insetM)
                : draw.t === "line"
                  ? linePath(draw.pts)
                  : draw.t === "diag"
                    ? veePath(draw.from, draw.to)
                    : "";
            isStraightVee(path, a, b);
          }
        }
      }
    });
  }
  assert.deepEqual(found, [
    "1c/2",
    "1c/7",
    "1c/8",
    "2c/7",
    "2c/12",
    "2c/18",
    "g4a/17",
    "g4a/22",
    "g4b/22",
    "g4b/27",
    "ev-a2/2",
    "ev-a2/9",
    "ev-b4/11",
    "ev-b4/14",
  ]);
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
test("Medium 4B movement 16 is a left half circle from B to E via C", () => {
  assert.deepEqual(TEST("4b", 16).draw[0], {
    t: "half",
    from: "B",
    to: "E",
    bulge: "C",
    hand: "left",
  });
  assert.equal(acrossHalfSide("B", "E", "left"), "C");
  assert.equal(acrossHalfSide("B", "E", "right"), "A");
  assert.equal(acrossHalfSide("E", "B", "left"), "A");
  assert.equal(acrossHalfSide("E", "B", "right"), "C");
  const crown = arcCrownOf(halfArc("B", "E", "C", "left"));
  assert.ok(crown.y < track("X").y, "left from B to E bulges toward C");
  assert.deepEqual(TEST("4b", 16).draw[1], { t: "line", pts: ["E", "V", "K", "A"] });
  // Movement 15 finishes P to B, which is toward C. The old arc renderer
  // still put bulge C on the A side; the hand, not that approach, chooses the side.
  const arrived = approachTravel("P", "B");
  assert.equal(arrived, "C");
});

test("every B-E and E-B half circle follows its hand, and the earlier centre-line fixes stay", () => {
  const sheets = [
    ...SET_0_TESTS,
    ...SET_1_TESTS,
    ...SET_TESTS,
    ...SET_3_TESTS,
    ...SET_4_TESTS,
    ...SET_5_TESTS,
    ...SET_6_TESTS,
    ...SET_7_TESTS,
    ...SET_G1_TESTS,
    ...SET_G2_TESTS,
    ...SET_G3_TESTS,
    ...SET_G4_TESTS,
    ...SET_GV_TESTS,
    ...SET_EVENTING_TESTS,
  ];
  const side = (y: number) => (y < track("X").y - 2 ? "C" : "A");
  const changed: string[] = [];
  for (const t of sheets) {
    const size = t.arenaSize ?? arenaSizeOf(t.arena);
    withArena(size, () => {
      for (const m of t.movements) {
        for (const d of m.draw) {
          const across =
            (d.t === "half" || d.t === "arc") &&
            ((d.from === "B" && d.to === "E") || (d.from === "E" && d.to === "B"));
          if (!across || (d.t !== "half" && d.t !== "arc")) continue;
          assert.equal(d.t, "half", `${t.id}/${m.n} is still an arc`);
          assert.ok(d.t === "half" && d.hand, `${t.id}/${m.n} has no hand`);
          if (d.t !== "half" || !d.hand) continue;
          const wanted = acrossHalfSide(d.from, d.to, d.hand);
          const now = side(arcCrownOf(halfArc(d.from, d.to, d.bulge, d.hand)).y);
          assert.equal(now, wanted, `${t.id}/${m.n}`);
          const before = side(arcCrownOf(halfArc(d.from, d.to, d.bulge)).y);
          if (before !== now) changed.push(`${t.id}/${m.n}`);
          if (t.id === "4b" && m.n === 16 && side(arcCrownOf(arcPath("B", "E", "C")).y) !== now)
            changed.push(`${t.id}/${m.n}`);
        }
      }
    });
  }
  assert.deepEqual(changed, [
    "4b/16",
    "g1a/14",
    "g2a/2",
    "g2b/20",
    "g3b/9",
    "g4b/15",
    "ev-a2/7",
    "ev-a4/2",
    "ev-a4/6",
    "ev-a5/15",
    "ev-c3/10",
  ]);
  const novice = SET_TESTS.find((t) => t.id === "2c")!.movements[21];
  const halt = novice.draw.find((d) => d.t === "half");
  assert.ok(halt && halt.t === "half");
  const travel = approachTravel("R", "B");
  assert.equal(side(arcCrownOf(halfArc(halt.from, halt.to, halt.bulge, halt.hand, travel)).y), "A");
});
test("Medium 4C half circles reach X and the correct track, continuing to FAK", () => {
  assert.deepEqual(TEST("4c", 2).draw.at(-1), {
    t: "half",
    from: "E",
    to: "X",
    bulge: "C",
    hand: "left",
  });
  assert.deepEqual(TEST("4c", 3).draw[0], {
    t: "half",
    from: "X",
    to: "B",
    bulge: "A",
    hand: "right",
  });
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
test("H S P rides the track to S before the diagonal, and the same rule covers the other three-letter routes", () => {
  assert.equal(trackThenDiagonal("H", "S", "P"), true);
  assert.equal(trackThenDiagonal("M", "R", "V"), true);
  assert.equal(trackThenDiagonal("K", "V", "R"), true);
  assert.equal(trackThenDiagonal("F", "P", "S"), true);
  assert.equal(trackThenDiagonal("H", "P", "F"), false);
  assert.equal(trackThenDiagonal("H", "X", "F"), false);
  const sheets = [
    ...SET_0_TESTS,
    ...SET_1_TESTS,
    ...SET_TESTS,
    ...SET_3_TESTS,
    ...SET_4_TESTS,
    ...SET_5_TESTS,
    ...SET_6_TESTS,
    ...SET_7_TESTS,
    ...SET_G1_TESTS,
    ...SET_G2_TESTS,
    ...SET_G3_TESTS,
    ...SET_G4_TESTS,
    ...SET_GV_TESTS,
    ...SET_EVENTING_TESTS,
  ];
  const found: string[] = [];
  for (const t of sheets) {
    for (const m of t.movements) {
      for (const step of m.steps) {
        const letters = step.at.split(/[^A-Z]+/).filter((tok) => tok.length === 1);
        for (let i = 0; i < letters.length - 2; i++) {
          const [a, b, c] = [letters[i], letters[i + 1], letters[i + 2]];
          if (!trackThenDiagonal(a, b, c)) continue;
          found.push(`${t.id}/${m.n}`);
          const trackLeg = m.draw.some(
            (d) => d.t === "line" && d.pts.includes(a) && d.pts.includes(b),
          );
          const cross = m.draw.some((d) => d.t === "diag" && d.from === b && d.to === c);
          const skipped = m.draw.some((d) => d.t === "diag" && d.from === a && d.to === c);
          assert.equal(trackLeg, true, `${t.id}/${m.n} misses the ${a}-${b} track`);
          assert.equal(cross, true, `${t.id}/${m.n} misses the ${b}-${c} diagonal`);
          assert.equal(skipped, false, `${t.id}/${m.n} still cuts ${a} straight to ${c}`);
        }
      }
    }
  }
  assert.deepEqual(found, ["4b/7"]);
  assert.deepEqual(TEST("4b", 7).draw, [
    { t: "line", pts: ["H", "S"] },
    { t: "diag", from: "S", to: "P" },
    { t: "line", pts: ["P", "F"] },
  ]);
  const along = linePath(["H", "S"]);
  const xs = [...along.matchAll(/[ML] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => +m[1]);
  assert.ok(
    xs.every((x) => Math.abs(x - LEFT) < 1),
    "H to S stays on the left track",
  );
  assert.deepEqual(TEST("4b", 9).draw, [
    { t: "diag", from: "H", to: "P" },
    { t: "line", pts: ["P", "F"] },
  ]);
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

/** Apex of an SVG circular arc, using endpoint-to-center conversion. */
function arcApex(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  sweep: number,
  x2: number,
  y2: number,
) {
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const lam = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const sign = sweep ? 1 : -1;
  const sq = Math.max(
    0,
    (rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx) /
      (rx * rx * dy * dy + ry * ry * dx * dx),
  );
  const coef = sign * Math.sqrt(sq);
  const cxp = (coef * rx * dy) / ry;
  const cyp = (coef * -(ry * dx)) / rx;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let ang = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) ang = -ang;
    return ang;
  };
  const theta1 = angle(1, 0, (dx - cxp) / rx, (dy - cyp) / ry);
  let dtheta = angle((dx - cxp) / rx, (dy - cyp) / ry, (-dx - cxp) / rx, (-dy - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  const mid = theta1 + dtheta / 2;
  return { x: rx * Math.cos(mid) + cx, y: ry * Math.sin(mid) + cy };
}

test("Medium 4B turns on the haunches are small pivots near G", () => {
  assert.deepEqual(TEST("4b", 4).draw, [
    { t: "line", pts: ["C", "M", "G"] },
    { t: "half-turn", at: "G", side: "H" },
  ]);
  assert.deepEqual(TEST("4b", 5).draw, [{ t: "half-turn", at: "G", side: "M" }]);
  assert.deepEqual(TEST("4b", 6).draw, [
    { t: "line", pts: ["C", "M", "G"] },
    { t: "half-turn", at: "G", side: "H" },
    { t: "half-turn", at: "G", side: "M" },
    { t: "line", pts: ["G", "H"] },
  ]);
  const g = track("G");
  const railGap = Math.abs(track("H").x - CX);
  for (const side of ["H", "M"] as const) {
    const turn = haunchesTurn(side);
    const rail = track(side);
    assert.equal(turn.radius, 10);
    assert.equal(turn.reach, 13);
    assert.equal(turn.pivot.y, g.y);
    assert.equal(turn.g.x, CX);
    assert.ok(turn.radius < 3 * M_PX.x, "forehand arc is only a couple of metres");
    assert.ok(
      turn.reach + turn.radius < railGap / 2,
      "stays near G, not a half-circle to the rail",
    );
    assert.ok(Math.abs(turn.crown.x - CX) < 20);
    assert.ok(Math.abs(turn.crown.x - rail.x) > 30);
    assert.ok(turn.crown.y > g.y && turn.crown.y < track("I").y);
    assert.equal(Math.sign(turn.pivot.x - CX), side === "H" ? -1 : 1);
    assert.equal(Math.hypot(turn.crown.x - turn.pivot.x, turn.crown.y - turn.pivot.y), turn.radius);
    const path = halfTurnPath(side);
    assert.ok(!path.includes("Q"));
    const nums = values(path);
    assert.deepEqual(nums.slice(0, 2), [g.x, g.y]);
    assert.deepEqual(nums.slice(-2), [g.x, g.y]);
    assert.ok(!nums.some((n, i) => i % 2 === 0 && n === rail.x));
    const arc = path.match(/A ([\d.]+) ([\d.]+) 0 0 ([01]) ([\d.-]+) ([\d.-]+)/);
    assert.ok(arc);
    const apex = arcApex(nums[2], nums[3], +arc[1], +arc[2], +arc[3], +arc[4], +arc[5]);
    assert.ok(Math.abs(apex.x - turn.crown.x) < 0.05, `${side} apex x`);
    assert.ok(
      Math.abs(apex.y - turn.crown.y) < 0.05,
      `${side} apex y ${apex.y} vs ${turn.crown.y}`,
    );
    for (const p of [turn.pivot, turn.arcStart, turn.arcEnd, turn.crown]) {
      assert.ok(p.x > LEFT && p.x < RIGHT && p.y > TOP && p.y < BOT);
    }
  }
  const towardH = haunchesTurn("H");
  const towardM = haunchesTurn("M");
  assert.equal(towardH.pivot.x, 2 * CX - towardM.pivot.x);
  assert.equal(towardH.crown.x, 2 * CX - towardM.crown.x);
  assert.equal(towardH.crown.y, towardM.crown.y);
  assert.equal(towardH.arcStart.x, 2 * CX - towardM.arcStart.x);
  assert.equal(towardH.arcEnd.x, 2 * CX - towardM.arcEnd.x);
});

test("20×40 letters are spaced at 6, 20, 34 and 40 metres, and 60×20 is unchanged", () => {
  assert.equal(track("E").y, 134);
  assert.equal(track("C").y, TOP);
  assert.equal(track("A").y, BOT);
  assert.equal(railParam("F"), 84);
  assert.equal(railParam("C"), 336);
  assert.equal(railParam("K"), 588);
  assert.equal(M_PX.y * 60, BOT - TOP);
  assert.equal((RIGHT - LEFT) / M_PX.x, 20);

  withArena("40x20", () => {
    const fromA = (id: string) => (BOT - track(id).y) / M_PX.y;
    const metres = (id: string, expected: number) =>
      assert.ok(
        Math.abs(fromA(id) - expected) < 1e-9,
        `${id} is ${fromA(id)}m, expected ${expected}`,
      );
    for (const id of ["K", "F", "D"]) metres(id, 6);
    for (const id of ["E", "B", "X"]) metres(id, 20);
    for (const id of ["H", "M", "G"]) metres(id, 34);
    metres("C", 40);
    metres("A", 0);
    assert.ok(Math.abs(fromA("E") - fromA("K") - 14) < 1e-9);
    assert.ok(Math.abs(fromA("H") - fromA("E") - 14) < 1e-9);
    assert.equal((track("F").x - track("K").x) / M_PX.x, 20);
    assert.equal(track("D").x, CX);
    assert.equal(track("X").x, CX);
    assert.equal(track("G").x, CX);
    assert.equal(track("K").x, LEFT);
    assert.equal(track("H").x, LEFT);
    assert.equal(track("F").x, RIGHT);
    assert.equal(track("M").x, RIGHT);
    assert.deepEqual([...arenaLetters("40x20")].sort(), [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "K",
      "M",
      "X",
    ]);
    assert.equal(
      arenaLetters("40x20").some((id) => "VPSRLI".includes(id)),
      false,
    );
  });

  assert.equal(track("E").y, 134, "withArena restores the 60m arena");
  assert.equal(arenaSizeOf("20 × 40"), "40x20");
  assert.equal(arenaSizeOf("40 × 20"), "40x20");
  assert.equal(arenaSizeOf("60 × 20"), "60x20");
  assert.equal(arenaSizeOf("60 × 20 or 40 × 20"), "60x20");
  assert.equal(arenaSizeOf(undefined), "60x20");
});

test("introductory sheets that allow 40m and never print a 60m letter use the small arena", () => {
  const sixtyOnly = new Set(["V", "P", "S", "R", "L", "I"]);
  const small = new Set(["A", "K", "E", "H", "C", "M", "B", "F", "X", "D", "G"]);
  for (const t of SET_0_TESTS) {
    assert.equal(t.arena, "60 × 20 or 40 × 20", t.id);
    assert.equal(t.arenaSize, "40x20", t.id);
    assert.equal(arenaSizeOf(t.arena), "60x20", "the shared wording still names 60m");
    const used = new Set<string>();
    for (const movement of t.movements) {
      for (const step of movement.steps) {
        for (const tok of step.at.split(/[\s&]+/)) {
          const id = tok.replace(/[^A-Z]/g, "");
          if (id.length === 1) used.add(id);
        }
      }
      for (const d of movement.draw) {
        if ("pts" in d && d.pts) for (const id of d.pts) used.add(id);
        if ("from" in d && d.from) used.add(d.from);
        if ("to" in d && d.to) used.add(d.to);
        if ("at" in d && d.at) used.add(d.at);
      }
    }
    for (const id of used) assert.ok(small.has(id), `${t.id} letter ${id}`);
    assert.equal(
      [...used].some((id) => sixtyOnly.has(id)),
      false,
      t.id,
    );
  }
});
