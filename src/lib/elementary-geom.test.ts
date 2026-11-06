import assert from "node:assert/strict";
import test from "node:test";
import { SET_3_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw } from "./esnz-tests.ts";
import {
  BOT,
  CORNER_RX,
  CORNER_RY,
  LEFT,
  M_PX,
  RIGHT,
  TOP,
  circleCenter,
  halfArc,
  lateralWork,
  lateralWorkPoints,
  linePath,
  serpentinePath,
  track,
} from "./arena-geom.ts";

function insideArena(p: { x: number; y: number }) {
  if (p.x < LEFT - 0.6 || p.x > RIGHT + 0.6 || p.y < TOP - 0.6 || p.y > BOT + 0.6) return false;
  const left = p.x < LEFT + CORNER_RX;
  const right = p.x > RIGHT - CORNER_RX;
  const high = p.y < TOP + CORNER_RY;
  const low = p.y > BOT - CORNER_RY;
  if ((left || right) && (high || low)) {
    const cx = left ? LEFT + CORNER_RX : RIGHT - CORNER_RX;
    const cy = high ? TOP + CORNER_RY : BOT - CORNER_RY;
    return ((p.x - cx) / CORNER_RX) ** 2 + ((p.y - cy) / CORNER_RY) ** 2 <= 1.02;
  }
  return true;
}

function quadSamples(d: string) {
  const cmds = d.match(/[MLQ](?: -?\d+(?:\.\d+)?){2,6}/g) ?? [];
  const pts: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  for (const cmd of cmds) {
    const n = cmd.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    if (cmd.startsWith("M") || cmd.startsWith("L")) {
      x = n[0];
      y = n[1];
      pts.push({ x, y });
    } else {
      const [cx, cy, x1, y1] = n;
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const u = 1 - t;
        pts.push({
          x: u * u * x + 2 * u * t * cx + t * t * x1,
          y: u * u * y + 2 * u * t * cy + t * t * y1,
        });
      }
      x = x1;
      y = y1;
    }
  }
  return pts;
}

function lineSamples(d: string) {
  const nums = [...d.matchAll(/[ML] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
  const pts = [...nums];
  for (let i = 1; i < nums.length; i++) {
    for (let s = 1; s < 6; s++) {
      const t = s / 6;
      pts.push({
        x: nums[i - 1].x + (nums[i].x - nums[i - 1].x) * t,
        y: nums[i - 1].y + (nums[i].y - nums[i - 1].y) * t,
      });
    }
  }
  return pts;
}

function ellipseSamples(at: string, diameter: number) {
  const c = circleCenter(at, diameter / 2);
  const rx = (diameter / 2) * M_PX.x;
  const ry = (diameter / 2) * M_PX.y;
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return { x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) };
  });
}

function drawSamples(d: Draw): { x: number; y: number }[] {
  switch (d.t) {
    case "line":
      return lineSamples(linePath(d.pts));
    case "diag":
    case "yield": {
      const a = track(d.from);
      const b = track(d.to);
      return Array.from({ length: 12 }, (_, i) => ({
        x: a.x + ((b.x - a.x) * i) / 11,
        y: a.y + ((b.y - a.y) * i) / 11,
      }));
    }
    case "half":
      return lineSamples(halfArc(d.from, d.to, d.bulge).replace(/A [^ ]+ [^ ]+ 0 0 [01] /, "L "));
    case "circle":
      return ellipseSamples(d.at, d.m);
    case "serpentine":
      return quadSamples(serpentinePath(d.from, d.first));
    case "change": {
      if (!("at" in d)) {
        const a = track(d.from);
        const b = track(d.to);
        const p = {
          x: a.x + (b.x - a.x) * d.along,
          y: a.y + (b.y - a.y) * d.along,
        };
        return [p, { x: p.x - 5, y: p.y }, { x: p.x + 5, y: p.y }];
      }
      const p = track(d.at);
      return [p, { x: p.x - 7, y: p.y }, { x: p.x + 7, y: p.y }, { x: p.x, y: p.y + 7 }];
    }
    case "halt":
    case "rein-back": {
      const p = track(d.at);
      const extra = d.t === "rein-back" ? 16 : 7;
      return [p, { x: p.x - 7, y: p.y }, { x: p.x + 7, y: p.y }, { x: p.x, y: p.y + extra }];
    }
    default:
      return [];
  }
}

test("elementary sheets keep movement counts, coefficients and totals", () => {
  assert.deepEqual(
    SET_3_TESTS.map((t) => [t.id, t.movements.length, marksFor(t).total]),
    [
      ["3a", 22, 350],
      ["3b", 28, 400],
      ["3c", 27, 410],
    ],
  );
  assert.deepEqual(
    SET_3_TESTS.map((t) => t.movements.filter((m) => m.coeff === 2).map((m) => m.n)),
    [
      [4, 5, 6, 7, 8, 12, 17],
      [9, 11, 14, 15, 22, 26],
      [3, 8, 12, 13, 14, 16, 21, 25],
    ],
  );
  for (const t of SET_3_TESTS) {
    assert.equal(marksFor(t).coll, 60);
    t.movements.forEach((m, i) => {
      assert.equal(m.n, i + 1);
      assert.ok(m.directive.length > 8);
      assert.ok(m.draw.length > 0);
    });
  }
});

test("elementary paths, including serpentines and 10m circles, stay inside the arena", () => {
  for (const t of SET_3_TESTS)
    for (const m of t.movements)
      for (const d of m.draw)
        for (const p of drawSamples(d))
          assert.ok(
            insideArena(p),
            `${t.short}/${m.n} ${d.t} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          );
  for (const [from, first, rail] of [
    ["C", "right", RIGHT],
    ["C", "left", LEFT],
    ["A", "left", LEFT],
  ] as const) {
    const samples = quadSamples(serpentinePath(from, first));
    const firstLoop = samples.slice(0, 24);
    const extreme =
      first === "left"
        ? Math.min(...firstLoop.map((p) => p.x))
        : Math.max(...firstLoop.map((p) => p.x));
    assert.ok(Math.abs(extreme - rail) < 0.2, `${from} ${first} touches ${rail}, got ${extreme}`);
    assert.ok(samples.every(insideArena));
  }
});

test("elementary shoulder-in and travers hatches match the sheet and stay at 30 degrees", () => {
  const expected = [
    "3A/4",
    "3A/5",
    "3B/4",
    "3B/6",
    "3B/9",
    "3B/11",
    "3C/4",
    "3C/6",
    "3C/9",
    "3C/11",
  ];
  const audited: string[] = [];
  for (const t of SET_3_TESTS)
    for (const m of t.movements)
      if (m.lateral) {
        const id = `${t.short}/${m.n}`;
        audited.push(id);
        assert.ok(m.lateral.kind === "shoulder-in" || m.lateral.kind === "travers", id);
        const ids = m.lateral.line ? m.lateral.pts : [m.lateral.from, m.lateral.to];
        const written = m.steps
          .filter((s) => /shoulder[ -]in|travers/i.test(s.do))
          .flatMap((s) => s.at.split(" "));
        assert.deepEqual(ids, written, id);
        const ticks = lateralWork(lateralWorkPoints(ids), m.lateral.kind, m.lateral.direction);
        assert.ok(ticks.length >= 2, id);
        const a = track(ids[0]);
        const b = track(ids[1]);
        for (const tick of ticks) {
          for (const p of [tick.centre, tick.from, tick.to, tick.nose, tick.tip])
            assert.ok(insideArena(p), `${id} hatch outside`);
          const dx = tick.nose.x - tick.from.x;
          const dy = tick.nose.y - tick.from.y;
          const travel = Math.atan2(b.y - a.y, b.x - a.x);
          const body = Math.atan2(dy, dx);
          const acute = Math.abs(Math.atan2(Math.sin(body - travel), Math.cos(body - travel)));
          assert.ok(Math.abs(acute - Math.PI / 6) < 1e-8, `${id} body angle`);
          assert.ok(dx * (b.x - a.x) + dy * (b.y - a.y) > 0, `${id} nose leads`);
        }
      }
  assert.deepEqual(audited, expected);
});

test("final halts follow the diagram from the side letter through the centre to G", () => {
  const lineOf = (id: string, n: number) => {
    const line = SET_3_TESTS.find((t) => t.id === id)!.movements[n - 1].draw.find(
      (d) => d.t === "line",
    );
    return line && line.t === "line" ? line.pts : [];
  };
  assert.deepEqual(lineOf("3a", 22), ["S", "I", "G"]);
  assert.deepEqual(lineOf("3b", 28), ["E", "X", "G"]);
  for (const [id, n, from, to] of [
    ["3c", 21, "F", "E"],
    ["3c", 25, "M", "E"],
  ] as const) {
    const marker = SET_3_TESTS.find((t) => t.id === id)!.movements[n - 1].draw.find(
      (d) => d.t === "change",
    );
    assert.ok(marker && !("at" in marker) && marker.from === from && marker.to === to);
    assert.equal(marker && !("at" in marker) ? marker.along : 0, 0.5);
  }
});
