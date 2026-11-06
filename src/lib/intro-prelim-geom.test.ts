import assert from "node:assert/strict";
import test from "node:test";
import { SET_0_TESTS, SET_1_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw, SetTest } from "./esnz-tests.ts";
import {
  BOT,
  CORNER_RX,
  CORNER_RY,
  CX,
  LEFT,
  M_PX,
  RIGHT,
  TOP,
  circleCenter,
  insetLoopPath,
  linePath,
  loopPath,
  track,
} from "./arena-geom.ts";

const TESTS: SetTest[] = [...SET_0_TESTS, ...SET_1_TESTS];

function insideArena(p: { x: number; y: number }) {
  if (p.x < LEFT - 0.6 || p.x > RIGHT + 0.6 || p.y < TOP - 0.6 || p.y > BOT + 0.6) return false;
  const left = p.x < LEFT + CORNER_RX;
  const right = p.x > RIGHT - CORNER_RX;
  const high = p.y < TOP + CORNER_RY;
  const low = p.y > BOT - CORNER_RY;
  if ((left || right) && (high || low)) {
    const cx = left ? LEFT + CORNER_RX : RIGHT - CORNER_RX;
    const cy = high ? TOP + CORNER_RY : BOT - CORNER_RY;
    return ((p.x - cx) / CORNER_RX) ** 2 + ((p.y - cy) / CORNER_RY) ** 2 <= 1.015;
  }
  return true;
}

function quadSamples(d: string) {
  const n = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const [x0, y0, cx, cy, x1, y1] = n;
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    };
  });
}

function lineSamples(d: string) {
  const nums = [...d.matchAll(/[ML] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
  const pts = [...nums];
  for (let i = 1; i < nums.length; i++) {
    for (let s = 1; s < 8; s++) {
      const t = s / 8;
      pts.push({
        x: nums[i - 1].x + (nums[i].x - nums[i - 1].x) * t,
        y: nums[i - 1].y + (nums[i].y - nums[i - 1].y) * t,
      });
    }
  }
  return pts;
}

function ellipseSamples(at: string, diameter: number, side?: "left" | "right") {
  const c = circleCenter(at, diameter / 2, side);
  const rx = (diameter / 2) * M_PX.x;
  const ry = (diameter / 2) * M_PX.y;
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return { x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) };
  });
}

function segmentSamples(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

function drawSamples(d: Draw) {
  switch (d.t) {
    case "line":
      return lineSamples(linePath(d.pts));
    case "diag":
    case "yield":
      return segmentSamples(track(d.from), track(d.to));
    case "loop":
      return quadSamples(d.insetM ? insetLoopPath(d.from, d.to, d.insetM) : loopPath(d.from, d.to));
    case "circle":
      return ellipseSamples(d.at, d.m, d.side);
    case "stretch":
      return ellipseSamples(d.at, 20);
    case "half":
    case "return-half":
    case "arc":
    case "half-turn":
    case "rein-back":
    case "change":
      return [];
    case "halt": {
      const p = track(d.at);
      return [
        p,
        { x: p.x - 7, y: p.y },
        { x: p.x + 7, y: p.y },
        { x: p.x, y: p.y - 5 },
        { x: p.x, y: p.y + 5 },
      ];
    }
  }
}

test("introductory and preliminary sheets keep their counts, coefficients and totals", () => {
  assert.deepEqual(
    TESTS.map((t) => [t.id, t.movements.length, marksFor(t).total]),
    [
      ["0a", 9, 150],
      ["0b", 9, 150],
      ["0c", 13, 190],
      ["0d", 13, 220],
      ["1a", 13, 250],
      ["1b", 16, 280],
      ["1c", 13, 240],
      ["1d", 18, 260],
    ],
  );
  assert.deepEqual(
    TESTS.map((t) => t.movements.filter((m) => m.coeff === 2).map((m) => m.n)),
    [[], [], [], [4, 7, 11], [2, 5, 6, 7, 9, 12], [3, 4, 8, 9, 12, 13], [2, 6, 7, 8, 12], [4, 11]],
  );
  for (const t of TESTS) {
    assert.equal(t.arena, "60 × 20 or 40 × 20");
    assert.equal(marksFor(t).coll, 60);
    t.movements.forEach((m, i) => {
      assert.equal(m.n, i + 1);
      assert.ok(m.directive.length > 8, `${t.id}/${m.n} directive`);
      assert.ok(m.steps.length > 0 && m.steps.every((s) => s.do.length > 2));
      assert.ok(m.draw.length > 0);
      assert.equal(m.lateral, undefined, `${t.id}/${m.n} has no lateral figure`);
    });
  }
});

test("introductory and preliminary paths stay inside the rounded arena", () => {
  for (const t of TESTS)
    for (const m of t.movements)
      for (const d of m.draw)
        for (const p of drawSamples(d))
          assert.ok(insideArena(p), `${t.id}/${m.n} ${d.t} left the arena at ${p.x},${p.y}`);
});

test("5m loops apex halfway to the centre line and one-loops pass through X", () => {
  for (const [from, to, rail] of [
    ["M", "F", RIGHT],
    ["H", "K", LEFT],
  ] as const) {
    const mid = quadSamples(insetLoopPath(from, to, 5))[12];
    const toward = rail === RIGHT ? -1 : 1;
    assert.ok(Math.abs(mid.x - (rail + toward * 5 * M_PX.x)) < 0.05, `${from}-${to} apex`);
    assert.ok(Math.abs(mid.x - CX) > 20, `${from}-${to} does not reach X`);
    assert.ok(quadSamples(insetLoopPath(from, to, 5)).every(insideArena));
  }
  for (const [from, to] of [
    ["H", "K"],
    ["M", "F"],
  ] as const) {
    const mid = quadSamples(loopPath(from, to))[12];
    assert.ok(Math.abs(mid.x - track("X").x) < 0.05);
    assert.ok(Math.abs(mid.y - track("X").y) < 0.05);
  }
  const shallow = SET_1_TESTS[3].movements.filter((m) =>
    m.draw.some((d) => d.t === "loop" && d.insetM === 5),
  );
  assert.deepEqual(
    shallow.map((m) => m.n),
    [2, 6],
  );
  const throughX = SET_1_TESTS[2].movements.filter((m) =>
    m.draw.some((d) => d.t === "loop" && !d.insetM),
  );
  assert.deepEqual(
    throughX.map((m) => m.n),
    [2, 8],
  );
});

test("20m end and side circles touch the track and the centre", () => {
  for (const at of ["A", "C", "E", "B"]) {
    const c = circleCenter(at, 10);
    const rx = 10 * M_PX.x;
    const ry = 10 * M_PX.y;
    assert.ok(Math.abs(c.x - CX) < 1e-6 || Math.abs(Math.abs(c.x - CX) - rx) < 1e-6);
    assert.ok(ellipseSamples(at, 20).every(insideArena), at);
    if (at === "E" || at === "B") assert.equal(c.x, CX);
    assert.ok(ry > 0 && rx > 0);
  }
});
