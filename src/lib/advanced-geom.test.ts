import assert from "node:assert/strict";
import test from "node:test";
import { SET_5_TESTS, SET_6_TESTS, marksFor } from "./esnz-tests.ts";
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
  halfPirouettePath,
  halfTurnPath,
  lateralWork,
  lateralWorkPoints,
  linePath,
  markerAt,
  markerPoint,
  pirouettePath,
  pointOn,
  quarterTurnPath,
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

function arcSamples(
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
  let arx = rx;
  let ary = ry;
  const lam = (dx * dx) / (arx * arx) + (dy * dy) / (ary * ary);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    arx *= s;
    ary *= s;
  }
  const sign = sweep === 0 ? 1 : -1;
  const root = Math.max(
    0,
    (arx * arx * ary * ary - arx * arx * dy * dy - ary * ary * dx * dx) /
      (arx * arx * dy * dy + ary * ary * dx * dx),
  );
  const coef = sign * Math.sqrt(root);
  const cx = (x1 + x2) / 2 + coef * ((arx * dy) / ary);
  const cy = (y1 + y2) / 2 + coef * -((ary * dx) / arx);
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1 - cx) / arx, (y1 - cy) / ary);
  let dtheta = ang((x1 - cx) / arx, (y1 - cy) / ary, (x2 - cx) / arx, (y2 - cy) / ary);
  if (sweep === 0 && dtheta > 0) dtheta -= Math.PI * 2;
  if (sweep === 1 && dtheta < 0) dtheta += Math.PI * 2;
  return Array.from({ length: 17 }, (_, i) => {
    const t = theta1 + (dtheta * i) / 16;
    return { x: cx + arx * Math.cos(t), y: cy + ary * Math.sin(t) };
  });
}

function pathSamples(d: string) {
  const tokens = d.match(/[MLA][^MLA]*/g) ?? [];
  const pts: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  for (const tok of tokens) {
    const n = tok
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (tok.startsWith("M") || tok.startsWith("L")) {
      x = n[0];
      y = n[1];
      pts.push({ x, y });
    } else {
      const [rx, ry, , , sweep, x2, y2] = n;
      pts.push(...arcSamples(x, y, rx, ry, sweep, x2, y2));
      x = x2;
      y = y2;
    }
  }
  return pts;
}

function drawSamples(d: Draw): { x: number; y: number }[] {
  switch (d.t) {
    case "line":
      return pathSamples(linePath(d.pts));
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
    case "arc":
      return pathSamples(halfArc(d.from, d.to, d.bulge));
    case "half-turn":
      return pathSamples(halfTurnPath(d.side));
    case "pirouette":
      return pathSamples(
        "turn" in d && d.turn === "quarter"
          ? quarterTurnPath(d.at, d.from, d.aim, d.direction)
          : "turn" in d && d.turn === "half"
            ? halfPirouettePath(d.from, d.to, d.along, d.direction, d.diameterM ?? 2)
            : pirouettePath(d.at, d.direction),
      );
    case "circle": {
      const between = d.betweenQuarterlines;
      const radius = between ? 5 : d.m / 2;
      const c = between ? circleCenter(d.at, 10) : circleCenter(d.at, radius, d.side);
      const rx = radius * M_PX.x;
      const ry = radius * M_PX.y;
      return Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return { x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) };
      });
    }
    case "halt":
    case "change":
    case "rein-back": {
      const p0 = d.t === "halt" || d.t === "rein-back" ? track(d.at) : { x: 0, y: 0 };
      const p =
        d.t === "change"
          ? "at" in d
            ? markerAt(d.at)
            : markerPoint(pointOn(d.from, d.to, d.along))
          : p0;
      if (d.t === "change")
        return [
          { x: p.x - 5, y: p.y },
          { x: p.x + 5, y: p.y },
          { x: p.x, y: p.y - 6 },
          { x: p.x, y: p.y + 5 },
        ];
      const inward = d.t === "rein-back" ? (d.at === "A" ? -16 : 16) : p.y + 5 > BOT ? -8 : 5;
      return [p, { x: p.x - 7, y: p.y }, { x: p.x + 7, y: p.y }, { x: p.x, y: p.y + inward }];
    }
    default:
      return [];
  }
}

const SHEETS = [...SET_5_TESTS, ...SET_6_TESTS];

test("advanced medium and advanced sheets keep counts, coefficients and totals", () => {
  assert.deepEqual(
    SHEETS.map((t) => [t.id, t.movements.length, marksFor(t).total]),
    [
      ["5a", 23, 360],
      ["5b", 22, 370],
      ["5c", 24, 390],
      ["6a", 24, 380],
      ["6b", 24, 380],
      ["6c", 24, 370],
    ],
  );
  assert.deepEqual(
    SHEETS.map((t) => t.movements.filter((m) => m.coeff === 2).map((m) => m.n)),
    [
      [3, 5, 7, 8, 11, 15, 19],
      [4, 5, 8, 11, 12, 15, 18, 19, 20],
      [5, 8, 11, 14, 15, 17, 18, 19, 20],
      [2, 3, 4, 11, 12, 14, 16, 22],
      [4, 5, 8, 9, 10, 19, 20, 21],
      [7, 8, 11, 12, 16, 19, 23],
    ],
  );
  for (const t of SHEETS) {
    assert.equal(marksFor(t).coll, 60);
    t.movements.forEach((m, i) => {
      assert.equal(m.n, i + 1);
      assert.ok(m.directive.length > 8, `${t.short}/${m.n} directive`);
      assert.ok(m.draw.length > 0);
    });
  }
});

test("advanced paths, pirouettes and flying-change markers stay inside the arena", () => {
  for (const t of SHEETS)
    for (const m of t.movements)
      for (const d of m.draw)
        for (const p of drawSamples(d))
          assert.ok(
            insideArena(p),
            `${t.short}/${m.n} ${d.t} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          );
});

test("half-pass hatches are 45 degrees and shoulder-in, travers and renvers are 30", () => {
  const expected = [
    "5A/2",
    "5A/3",
    "5A/4",
    "5A/5",
    "5B/3",
    "5B/4",
    "5B/7",
    "5B/8",
    "5B/14",
    "5B/17",
    "5C/3",
    "5C/5",
    "5C/9",
    "5C/11",
    "5C/17",
    "5C/19",
    "6A/3",
    "6A/4",
    "6A/7",
    "6A/8",
    "6A/14",
    "6A/18",
    "6B/2",
    "6B/4",
    "6B/5",
    "6B/6",
    "6B/14",
    "6B/16",
    "6C/4",
    "6C/5",
    "6C/9",
    "6C/10",
    "6C/15",
    "6C/18",
  ];
  const audited: string[] = [];
  for (const t of SHEETS)
    for (const m of t.movements)
      if (m.lateral) {
        const id = `${t.short}/${m.n}`;
        audited.push(id);
        const ids = m.lateral.line ? m.lateral.pts : [m.lateral.from, m.lateral.to];
        const written = m.steps
          .filter((s) => /shoulder-in|travers|renvers|half pass|leg yield/i.test(s.do))
          .flatMap((s) => s.at.split(" "));
        assert.deepEqual(ids, written, id);
        const diagonal = m.lateral.kind === "half-pass" || m.lateral.kind === "leg-yield";
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
          assert.ok(
            Math.abs(acute - (diagonal ? Math.PI / 4 : Math.PI / 6)) < 1e-8,
            `${id} body angle`,
          );
          assert.ok(dx * (b.x - a.x) + dy * (b.y - a.y) > 0, `${id} nose leads`);
        }
      }
  assert.deepEqual(audited, expected);
});

test("changes and pirouettes sit on the sheet's line, and the final halt runs to G", () => {
  const movement = (id: string, n: number) =>
    SHEETS.find((t) => t.id === id)!.movements.find((m) => m.n === n)!;
  const placed = (id: string, n: number) =>
    movement(id, n).draw.filter((d) => d.t === "change" && !("at" in d));

  const betweenCentreAndR = pointOn("V", "R", 0.75);
  assert.ok(betweenCentreAndR.x > track("X").x, "5A change is past the centre toward R");
  assert.ok(betweenCentreAndR.y < track("X").y && betweenCentreAndR.y > track("R").y);
  const firstChange = placed("5a", 15)[0];
  assert.equal(firstChange && "along" in firstChange ? firstChange.along : 0, 0.75);

  const betweenRAndM = pointOn("R", "M", 0.5);
  assert.ok(Math.abs(betweenRAndM.x - track("R").x) < 0.1);
  assert.ok(betweenRAndM.y > track("M").y && betweenRAndM.y < track("R").y);

  const betweenXAndP = pointOn("S", "P", 0.75);
  assert.ok(betweenXAndP.x > track("X").x && betweenXAndP.y > track("X").y);
  const half = movement("6c", 16).draw.find((d) => d.t === "pirouette");
  assert.ok(
    half && "turn" in half && half.turn === "half" && half.along === 0.75 && half.diameterM === 2,
  );

  assert.deepEqual(
    placed("6a", 22).map((d) => ("along" in d ? d.along : 0)),
    [0.174, 0.5, 0.802],
  );
  assert.deepEqual(
    placed("6b", 20).map((d) => ("along" in d ? d.along : 0)),
    [0.269, 0.5, 0.731],
  );
  assert.deepEqual(
    placed("6c", 23).map((d) => ("along" in d ? d.along : 0)),
    [0.327, 0.5, 0.673],
  );

  const quarter = movement("6b", 19).draw.find((d) => d.t === "pirouette");
  assert.ok(
    quarter &&
      "turn" in quarter &&
      quarter.turn === "quarter" &&
      quarter.aim === "F" &&
      quarter.from === "K",
  );
  const quarterLeft = movement("6b", 21).draw.find((d) => d.t === "pirouette");
  assert.ok(
    quarterLeft &&
      "turn" in quarterLeft &&
      quarterLeft.turn === "quarter" &&
      quarterLeft.aim === "M",
  );

  const collected = movement("6a", 16).draw.find((d) => d.t === "circle" && d.betweenQuarterlines);
  assert.ok(collected);

  for (const [id, n] of [
    ["5c", 24],
    ["6a", 24],
  ] as const) {
    const line = movement(id, n).draw.find((d) => d.t === "line");
    assert.deepEqual(line && line.t === "line" ? line.pts : [], ["E", "X", "G"]);
  }
});
