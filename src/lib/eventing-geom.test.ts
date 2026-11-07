import assert from "node:assert/strict";
import test from "node:test";
import { SET_EVENTING_TESTS, marksFor } from "./esnz-tests.ts";
import type { Draw } from "./esnz-tests.ts";
import { isPublishedTest, SEEDED_APPROVED_TEST_IDS, testIdForName } from "./test-registry.ts";
import {
  BOT,
  CORNER_RX,
  CORNER_RY,
  LEFT,
  M_PX,
  RIGHT,
  TOP,
  arenaFor,
  arenaSizeOf,
  circleCenter,
  halfPirouettePath,
  loopOrVeePath,
  lateralWork,
  lateralWorkPoints,
  linePath,
  sameSideThroughX,
  samplePath,
  serpentinePath,
  track,
  veePath,
  withArena,
} from "./arena-geom.ts";

const TOTALS: Record<string, number> = {
  "ev-l1": 190,
  "ev-l2": 190,
  "ev-l3": 170,
  "ev-l4": 200,
  "ev-l5": 180,
  "ev-a1": 210,
  "ev-a2": 200,
  "ev-a3": 200,
  "ev-a4": 200,
  "ev-a5": 200,
  "ev-b1": 230,
  "ev-b2": 200,
  "ev-b3": 200,
  "ev-b4": 200,
  "ev-b5": 200,
  "ev-c1": 220,
  "ev-c2": 230,
  "ev-c3": 220,
  "ev-c4": 240,
  "ev-d1": 280,
  "ev-d2": 280,
};

const SMALL = new Set(["ev-l1", "ev-l2", "ev-l4", "ev-a1", "ev-a2", "ev-b2", "ev-b3", "ev-c1"]);
const SIXTY_ONLY = new Set(["V", "P", "S", "R", "L", "I"]);

function inside(
  p: { x: number; y: number },
  box: {
    left: number;
    right: number;
    top: number;
    bot: number;
    cornerRx: number;
    cornerRy: number;
  },
) {
  if (p.x < box.left - 1 || p.x > box.right + 1 || p.y < box.top - 1 || p.y > box.bot + 1)
    return false;
  const left = p.x < box.left + box.cornerRx;
  const right = p.x > box.right - box.cornerRx;
  const high = p.y < box.top + box.cornerRy;
  const low = p.y > box.bot - box.cornerRy;
  if ((left || right) && (high || low)) {
    const cx = left ? box.left + box.cornerRx : box.right - box.cornerRx;
    const cy = high ? box.top + box.cornerRy : box.bot - box.cornerRy;
    return ((p.x - cx) / box.cornerRx) ** 2 + ((p.y - cy) / box.cornerRy) ** 2 <= 1.05;
  }
  return true;
}

function pathSamples(d: string) {
  const tokens = d.match(/[MLQA][^MLQA]*/g) ?? [];
  const pts: { x: number; y: number }[] = [];
  for (const tok of tokens) {
    const n = tok
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (tok.startsWith("M") || tok.startsWith("L")) pts.push({ x: n[0], y: n[1] });
    else if (tok.startsWith("Q")) {
      const [x0, y0] = pts.at(-1) ? [pts.at(-1)!.x, pts.at(-1)!.y] : [n[0], n[1]];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const u = 1 - t;
        pts.push({
          x: u * u * x0 + 2 * u * t * n[0] + t * t * n[2],
          y: u * u * y0 + 2 * u * t * n[1] + t * t * n[3],
        });
      }
    }
  }
  return pts;
}

function samples(d: Draw): { x: number; y: number }[] {
  switch (d.t) {
    case "line":
      return pathSamples(linePath(d.pts));
    case "diag":
    case "yield": {
      if (d.t === "diag" && sameSideThroughX(d.from, d.to))
        return pathSamples(veePath(d.from, d.to));
      const a = track(d.from);
      const b = track(d.to);
      return [a, b, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];
    }
    case "circle": {
      const radius = d.m / 2;
      const c = circleCenter(d.at, radius, d.side);
      return Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return { x: c.x + radius * M_PX.x * Math.cos(a), y: c.y + radius * M_PX.y * Math.sin(a) };
      });
    }
    case "half":
      return [track(d.from), track(d.to)];
    case "loop":
      return pathSamples(loopOrVeePath(d.from, d.to, d.insetM));
    case "serpentine":
      return samplePath(serpentinePath(d.from, d.first, d.loops ?? 3, d.to));
    case "pirouette":
      if ("turn" in d && d.turn === "half")
        return pathSamples(halfPirouettePath(d.from, d.to, d.along, d.direction, d.diameterM ?? 3));
      return [];
    case "halt":
    case "rein-back":
    case "change":
      return [];
    default:
      return [];
  }
}

test("eventing sheets use the printed arena, the printed total, and stay drafts", () => {
  assert.equal(SET_EVENTING_TESTS.length, 21);
  const approved = new Set(SEEDED_APPROVED_TEST_IDS);
  for (const t of SET_EVENTING_TESTS) {
    assert.equal(marksFor(t).total, TOTALS[t.id], t.id);
    assert.equal(t.movements.length, t.movements.at(-1)?.n, `${t.id} numbering`);
    t.movements.forEach((m, i) => assert.equal(m.n, i + 1, t.id));
    const small = SMALL.has(t.id);
    assert.equal(t.arenaSize ?? arenaSizeOf(t.arena), small ? "40x20" : "60x20", t.id);
    assert.equal(isPublishedTest(t.name, approved), false, t.id);
    assert.equal(testIdForName(t.short), t.id, t.short);
    if (small) {
      for (const m of t.movements)
        for (const d of m.draw)
          for (const id of JSON.stringify(d).match(/[A-Z]/g) ?? [])
            assert.equal(SIXTY_ONLY.has(id), false, `${t.id} uses ${id}`);
    }
  }
});

test("eventing paths stay inside the arena each sheet names", () => {
  for (const t of SET_EVENTING_TESTS) {
    const size = t.arenaSize ?? arenaSizeOf(t.arena);
    const frame = arenaFor(size);
    const box = {
      left: frame.left,
      right: frame.right,
      top: frame.top,
      bot: frame.bot,
      cornerRx: frame.cornerRx,
      cornerRy: frame.cornerRy,
    };
    withArena(size, () => {
      for (const m of t.movements) {
        for (const d of m.draw)
          for (const p of samples(d))
            assert.ok(
              inside(p, box),
              `${t.id}/${m.n} ${d.t} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
            );
        if (m.lateral) {
          const ids = m.lateral.line ? m.lateral.pts : [m.lateral.from, m.lateral.to];
          for (const tick of lateralWork(
            lateralWorkPoints(ids),
            m.lateral.kind,
            m.lateral.direction,
          ))
            for (const p of [tick.from, tick.nose, tick.tip])
              assert.ok(inside(p, box), `${t.id}/${m.n} hatch`);
        }
      }
    });
  }
  assert.equal(track("E").y, 134);
  assert.equal(BOT - TOP, 60 * M_PX.y);
  assert.ok(LEFT < RIGHT && CORNER_RX > 0 && CORNER_RY > 0);
});
