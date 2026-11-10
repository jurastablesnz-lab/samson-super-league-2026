/**
 * Phone schematic. A at the bottom. Length is compressed the same way for both
 * arenas (3.6px per metre), so a 20×40 arena is simply the shorter rectangle.
 * The 60×20 exports below stay the default; call `withArena` for the small arena.
 */

export const CX = 110;
export const LEFT = 50;
export const RIGHT = 170;
export const TOP = 28;
export const BOT = 244;
export const CORNER_RX = 22;
export const CORNER_RY = 13.5;

export type ArenaSize = "60x20" | "40x20";

/** "60 × 20 or 40 × 20" stays on the large arena. A sheet that is only 40m uses the small one. */
export function arenaSizeOf(arena: string | undefined): ArenaSize {
  if (arena && /\b60\b/.test(arena)) return "60x20";
  if (arena && /\b40\b/.test(arena)) return "40x20";
  return "60x20";
}

const Y: Record<string, number> = {
  C: TOP,
  H: 48,
  M: 48,
  G: 48,
  S: 72,
  R: 72,
  I: 72,
  E: 134,
  B: 134,
  X: 134,
  V: 196,
  P: 196,
  L: 196,
  K: 220,
  F: 220,
  D: 220,
  A: BOT,
};

const LEFTS = new Set(["H", "S", "E", "V", "K"]);
const RIGHTS = new Set(["M", "R", "B", "P", "F"]);

/** Long side, C toward A. Neighbours are one letter apart on the track. */
const LEFT_DOWN = ["H", "S", "E", "V", "K"] as const;
const RIGHT_DOWN = ["M", "R", "B", "P", "F"] as const;

/**
 * H S P, M R V, K V R, F P S: the first two letters are neighbours on one
 * long side, and the third is on the other. Ride the track between the first
 * two, then the straight line across. It is not one diagonal from the first
 * letter to the third.
 */
export function trackThenDiagonal(a: string, b: string, c: string): boolean {
  const neighbours = (rail: readonly string[]) => {
    const i = rail.indexOf(a);
    const j = rail.indexOf(b);
    return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
  };
  if (neighbours(LEFT_DOWN)) return (RIGHT_DOWN as readonly string[]).includes(c);
  if (neighbours(RIGHT_DOWN)) return (LEFT_DOWN as readonly string[]).includes(c);
  return false;
}

/** Letters that sit on the fence. Centre-line markers are not on the rail. */
const RAIL = new Set([
  "A",
  "K",
  "V",
  "E",
  "S",
  "H",
  "C",
  "M",
  "R",
  "B",
  "P",
  "F",
  "CH",
  "CM",
  "FA",
  "AK",
]);

export const LETTER_IDS = [
  "C",
  "H",
  "M",
  "G",
  "S",
  "R",
  "I",
  "E",
  "B",
  "X",
  "V",
  "P",
  "L",
  "K",
  "F",
  "D",
  "A",
];

export const M_PX = { x: 120 / 20, y: 216 / 60 };

const EXTRA: Record<string, { x: number; y: number }> = {
  CH: { x: LEFT + 22, y: TOP },
  CM: { x: RIGHT - 22, y: TOP },
  FA: { x: RIGHT, y: BOT - 14 },
  AK: { x: LEFT, y: BOT - 14 },
  GI: { x: CX, y: 60 },
};

export function track(id: string): { x: number; y: number } {
  if (geom.extra[id]) return geom.extra[id];
  const y = geom.y[id] ?? geom.y.X;
  if (geom.lefts.has(id)) return { x: geom.left, y };
  if (geom.rights.has(id)) return { x: geom.right, y };
  return { x: geom.cx, y };
}

/** A point on the straight line from one letter to another. `along` is 0 at `from` and 1 at `to`. */
export function pointOn(from: string, to: string, along: number) {
  const a = track(from);
  const b = track(to);
  return { x: a.x + (b.x - a.x) * along, y: a.y + (b.y - a.y) * along };
}

/** Where a straight line crosses the centre line, as a fraction from `from` to `to`. */
export function centreAlong(from: string, to: string) {
  const a = track(from);
  const b = track(to);
  if (Math.abs(b.x - a.x) < 1) return 0.5;
  return (geom.cx - a.x) / (b.x - a.x);
}

/** Flying-change marker, pulled inside the rail so the circle stays in the arena. */
export function markerPoint(p: { x: number; y: number }) {
  return {
    x: Math.min(geom.right - 6, Math.max(geom.left + 6, p.x)),
    y: Math.min(geom.bot - 6, Math.max(geom.top + 6, p.y)),
  };
}

export function markerAt(at: string) {
  return markerPoint(track(at));
}

export function label(id: string): { x: number; y: number } {
  const y = geom.y[id] ?? geom.y.X;
  if (geom.lefts.has(id)) return { x: geom.left - 14, y };
  if (geom.rights.has(id)) return { x: geom.right + 14, y };
  if (id === "C") return { x: geom.cx, y: geom.top - 14 };
  if (id === "A") return { x: geom.cx, y: geom.bot + 12 };
  return { x: geom.cx, y };
}

export function isRail(id: string) {
  return geom.rail.has(id);
}

export function circleCenter(
  at: string,
  m: number,
  side?: "left" | "right",
): { x: number; y: number } {
  const p = track(at);
  if (at === "C") return { x: geom.cx, y: geom.top + m * geom.mPx.y };
  if (at === "A") return { x: geom.cx, y: geom.bot - m * geom.mPx.y };
  if (side) return { x: geom.cx + (side === "left" ? -1 : 1) * m * geom.mPx.x, y: p.y };
  if (geom.lefts.has(at)) return { x: geom.left + m * geom.mPx.x, y: p.y };
  if (geom.rights.has(at)) return { x: geom.right - m * geom.mPx.x, y: p.y };
  return p;
}

const HW = RIGHT - CX;
const W = RIGHT - LEFT;
const H = BOT - TOP;
export const PERIM = 2 * (W + H);

const RAIL_POSITIONS: Record<string, number> = {
  A: 0,
  F: 84,
  P: 108,
  B: 170,
  R: 232,
  M: 256,
  C: 336,
  H: 416,
  S: 440,
  E: 502,
  V: 564,
  K: 588,
};

/** Clockwise distance from A along the sharp rectangle. */
export function railParam(id: string): number {
  return geom.railPositions[id] ?? 0;
}

type ArenaFrame = {
  size: ArenaSize;
  cx: number;
  left: number;
  right: number;
  top: number;
  bot: number;
  cornerRx: number;
  cornerRy: number;
  mPx: { x: number; y: number };
  y: Record<string, number>;
  lefts: Set<string>;
  rights: Set<string>;
  rail: Set<string>;
  letters: readonly string[];
  extra: Record<string, { x: number; y: number }>;
  railPositions: Record<string, number>;
  perim: number;
  hw: number;
  w: number;
  h: number;
};

const large: ArenaFrame = {
  size: "60x20",
  cx: CX,
  left: LEFT,
  right: RIGHT,
  top: TOP,
  bot: BOT,
  cornerRx: CORNER_RX,
  cornerRy: CORNER_RY,
  mPx: M_PX,
  y: Y,
  lefts: LEFTS,
  rights: RIGHTS,
  rail: RAIL,
  letters: LETTER_IDS,
  extra: EXTRA,
  railPositions: RAIL_POSITIONS,
  perim: PERIM,
  hw: HW,
  w: W,
  h: H,
};

/** 20×40: corner letters 6m from the short sides, E/B/X at 20m, H/M/G at 34m. */
const smallTop = BOT - 40 * M_PX.y;
const smallY: Record<string, number> = {
  A: BOT,
  K: BOT - 6 * M_PX.y,
  F: BOT - 6 * M_PX.y,
  D: BOT - 6 * M_PX.y,
  E: BOT - 20 * M_PX.y,
  B: BOT - 20 * M_PX.y,
  X: BOT - 20 * M_PX.y,
  H: BOT - 34 * M_PX.y,
  M: BOT - 34 * M_PX.y,
  G: BOT - 34 * M_PX.y,
  C: smallTop,
};
const smallH = BOT - smallTop;
const smallRail = {
  A: 0,
  F: HW + 6 * M_PX.y,
  B: HW + 20 * M_PX.y,
  M: HW + 34 * M_PX.y,
  C: HW + smallH + HW,
  H: HW + smallH + W + 6 * M_PX.y,
  E: HW + smallH + W + 20 * M_PX.y,
  K: HW + smallH + W + 34 * M_PX.y,
};
const small: ArenaFrame = {
  size: "40x20",
  cx: CX,
  left: LEFT,
  right: RIGHT,
  top: smallTop,
  bot: BOT,
  cornerRx: CORNER_RX,
  cornerRy: CORNER_RY,
  mPx: M_PX,
  y: smallY,
  lefts: new Set(["H", "E", "K"]),
  rights: new Set(["M", "B", "F"]),
  rail: new Set(["A", "K", "E", "H", "C", "M", "B", "F", "CH", "CM", "FA", "AK"]),
  letters: ["C", "H", "M", "G", "E", "B", "X", "K", "F", "D", "A"],
  extra: {
    CH: { x: LEFT + CORNER_RX, y: smallTop },
    CM: { x: RIGHT - CORNER_RX, y: smallTop },
    FA: { x: RIGHT, y: BOT - 14 },
    AK: { x: LEFT, y: BOT - 14 },
  },
  railPositions: smallRail,
  perim: 2 * (W + smallH),
  hw: HW,
  w: W,
  h: smallH,
};

let geom: ArenaFrame = large;

export function arenaFor(size: ArenaSize): ArenaFrame {
  return size === "40x20" ? small : large;
}

/** Run geometry against one arena. The default, outside this call, stays 60×20. */
export function withArena<T>(size: ArenaSize, fn: () => T): T {
  const prev = geom;
  geom = arenaFor(size);
  try {
    return fn();
  } finally {
    geom = prev;
  }
}

export function arenaLetters(size: ArenaSize = "60x20"): readonly string[] {
  return arenaFor(size).letters;
}

function wrap(t: number) {
  const p = geom.perim;
  return ((t % p) + p) % p;
}

function pointOnSharp(t: number): { x: number; y: number } {
  t = wrap(t);
  if (t < geom.hw) return { x: geom.cx + t, y: geom.bot };
  t -= geom.hw;
  if (t < geom.h) return { x: geom.right, y: geom.bot - t };
  t -= geom.h;
  if (t < geom.w) return { x: geom.right - t, y: geom.top };
  t -= geom.w;
  if (t < geom.h) return { x: geom.left, y: geom.top + t };
  t -= geom.h;
  return { x: geom.left + t, y: geom.bot };
}

function roundCorner(p: { x: number; y: number }): { x: number; y: number } {
  const rx = geom.cornerRx;
  const ry = geom.cornerRy;
  const corners = [
    { cx: geom.right - rx, cy: geom.bot - ry, sx: 1, sy: 1 },
    { cx: geom.right - rx, cy: geom.top + ry, sx: 1, sy: -1 },
    { cx: geom.left + rx, cy: geom.top + ry, sx: -1, sy: -1 },
    { cx: geom.left + rx, cy: geom.bot - ry, sx: -1, sy: 1 },
  ];
  for (const c of corners) {
    const inX = c.sx > 0 ? p.x >= c.cx : p.x <= c.cx;
    const inY = c.sy > 0 ? p.y >= c.cy : p.y <= c.cy;
    if (!inX || !inY) continue;
    const dx = (p.x - c.cx) / rx;
    const dy = (p.y - c.cy) / ry;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      return { x: c.cx + c.sx * rx * 0.707, y: c.cy + c.sy * ry * 0.707 };
    }
    return { x: c.cx + (dx / len) * rx, y: c.cy + (dy / len) * ry };
  }
  return p;
}

function shortestDir(a: string, b: string): "cw" | "ccw" {
  const ta = railParam(a);
  const tb = railParam(b);
  const cw = wrap(tb - ta);
  const ccw = wrap(ta - tb);
  return cw <= ccw ? "cw" : "ccw";
}

function sampleRail(a: string, b: string): { x: number; y: number }[] {
  const t0 = railParam(a);
  const t1 = railParam(b);
  const dir = shortestDir(a, b);
  const len = dir === "cw" ? wrap(t1 - t0) : wrap(t0 - t1);
  if (len < 0.8) return [track(a), track(b)];
  if (len < 16) {
    const turn = dir === "cw" ? 1 : -1;
    return [
      roundCorner(pointOnSharp(t0)),
      roundCorner(pointOnSharp(t0 + (turn * len) / 2)),
      roundCorner(pointOnSharp(t0 + turn * len)),
    ];
  }
  const n = Math.max(4, Math.ceil(len / 3.5));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = dir === "cw" ? t0 + (len * i) / n : t0 - (len * i) / n;
    pts.push(roundCorner(pointOnSharp(t)));
  }
  return pts;
}

/**
 * H with K, and M with F, are the two long sides. "H X K" leaves the wall on a
 * straight line to X and comes back out on a straight line. The corner is X.
 */
export function sameSideThroughX(a: string, b: string) {
  return (
    (a === "H" && b === "K") ||
    (a === "K" && b === "H") ||
    (a === "M" && b === "F") ||
    (a === "F" && b === "M")
  );
}

/** Straight V through `via`. For H–X–K the point is exactly X, not a bow beside it. */
export function veePath(from: string, to: string, via = "X"): string {
  const a = track(from);
  const p = track(via);
  const b = track(to);
  const f = (n: number) => n.toFixed(1);
  return `M ${f(a.x)} ${f(a.y)} L ${f(p.x)} ${f(p.y)} L ${f(b.x)} ${f(b.y)}`;
}

/**
 * A shallow inset stays a curve. A same-side line through X is the straight V.
 * Anything else keeps the quadratic loop.
 */
export function loopOrVeePath(from: string, to: string, insetM?: number): string {
  if (insetM) return insetLoopPath(from, to, insetM);
  if (sameSideThroughX(from, to)) return veePath(from, to);
  return loopPath(from, to);
}

/** SVG path for a polyline of letters, following rounded rails between fence letters. */
export function linePath(ids: string[]): string {
  if (ids.length === 0) return "";
  const first = track(ids[0]);
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < ids.length; i++) {
    const a = ids[i - 1];
    const b = ids[i];
    if (isRail(a) && isRail(b)) {
      const samples = sampleRail(a, b);
      for (let j = 1; j < samples.length; j++) {
        d += ` L ${samples[j].x.toFixed(1)} ${samples[j].y.toFixed(1)}`;
      }
    } else {
      const p = track(b);
      d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
  }
  return d;
}

/** Points along an SVG path of M, L, Q and A commands. Arcs are the real ellipse. */
export function samplePath(d: string, steps = 16): { x: number; y: number }[] {
  const tokens = d.match(/[MLQA][^MLQA]*/g) ?? [];
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
    } else if (tok.startsWith("Q")) {
      const [cx, cy, x1, y1] = n;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        pts.push({
          x: u * u * x + 2 * u * t * cx + t * t * x1,
          y: u * u * y + 2 * u * t * cy + t * t * y1,
        });
      }
      x = x1;
      y = y1;
    } else {
      const [rx, ry, , , sweep, x1, y1] = n;
      const arc = ellipsePoints({ x, y }, { x: x1, y: y1 }, rx, ry, sweep as 0 | 1, steps);
      pts.push(...arc);
      x = x1;
      y = y1;
    }
  }
  return pts;
}

function ellipsePoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rx: number,
  ry: number,
  sweep: 0 | 1,
  steps: number,
) {
  const dx = (a.x - b.x) / 2;
  const dy = (a.y - b.y) / 2;
  let arx = rx;
  let ary = ry;
  const lam = (dx * dx) / (arx * arx) + (dy * dy) / (ary * ary);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    arx *= s;
    ary *= s;
  }
  const sign = sweep === 0 ? -1 : 1;
  const denom = arx * arx * dy * dy + ary * ary * dx * dx;
  const root = Math.max(
    0,
    (arx * arx * ary * ary - arx * arx * dy * dy - ary * ary * dx * dx) / denom,
  );
  const coef = sign * Math.sqrt(root);
  const cx = (a.x + b.x) / 2 + coef * ((arx * dy) / ary);
  const cy = (a.y + b.y) / 2 + coef * -((ary * dx) / arx);
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
    let theta = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) theta = -theta;
    return theta;
  };
  const theta1 = ang(1, 0, (a.x - cx) / arx, (a.y - cy) / ary);
  let dtheta = ang((a.x - cx) / arx, (a.y - cy) / ary, (b.x - cx) / arx, (b.y - cy) / ary);
  if (sweep === 0 && dtheta > 0) dtheta -= Math.PI * 2;
  if (sweep === 1 && dtheta < 0) dtheta += Math.PI * 2;
  return Array.from({ length: steps }, (_, i) => {
    const theta = theta1 + (dtheta * (i + 1)) / steps;
    return { x: cx + arx * Math.cos(theta), y: cy + ary * Math.sin(theta) };
  });
}

/** Midpoint of an SVG elliptical arc. large-arc is 0, matching the paths this file emits. */
function arcCrown(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rx: number,
  ry: number,
  sweep: 0 | 1,
): { x: number; y: number } {
  const dx = (a.x - b.x) / 2;
  const dy = (a.y - b.y) / 2;
  let arx = rx;
  let ary = ry;
  const lam = (dx * dx) / (arx * arx) + (dy * dy) / (ary * ary);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    arx *= s;
    ary *= s;
  }
  // SVG spec: sign is -1 when the large-arc flag equals the sweep flag.
  const sign = sweep === 0 ? -1 : 1;
  const denom = arx * arx * dy * dy + ary * ary * dx * dx;
  const root = Math.max(
    0,
    (arx * arx * ary * ary - arx * arx * dy * dy - ary * ary * dx * dx) / denom,
  );
  const coef = sign * Math.sqrt(root);
  const cx = (a.x + b.x) / 2 + coef * ((arx * dy) / ary);
  const cy = (a.y + b.y) / 2 + coef * -((ary * dx) / arx);
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
    let theta = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) theta = -theta;
    return theta;
  };
  const theta1 = ang(1, 0, (a.x - cx) / arx, (a.y - cy) / ary);
  let dtheta = ang((a.x - cx) / arx, (a.y - cy) / ary, (b.x - cx) / arx, (b.y - cy) / ary);
  if (sweep === 0 && dtheta > 0) dtheta -= Math.PI * 2;
  if (sweep === 1 && dtheta < 0) dtheta += Math.PI * 2;
  const mid = theta1 + dtheta / 2;
  return { x: cx + arx * Math.cos(mid), y: cy + ary * Math.sin(mid) };
}

const CENTRE_LETTERS = new Set(["X", "I", "L", "D", "G"]);

/**
 * Direction along the track from `prev` into `at`. Larger screen y is toward A.
 * A flat step (B to E, for example) has no along-track direction.
 */
export function approachTravel(prev: string | undefined, at: string): "A" | "C" | undefined {
  if (!prev) return undefined;
  const dy = track(at).y - track(prev).y;
  if (Math.abs(dy) < 2) return undefined;
  return dy > 0 ? "A" : "C";
}

/**
 * Side the crown should sit for a left or right half circle.
 * On the centre line the rider travels along the chord, so left is the rider's
 * left (A to X left bulges toward the left long side). Between the long sides
 * the half circle is entered along the track, so a left bend is the other way:
 * B to X left bulges toward C, and X to E right bulges toward A.
 */
function handOffset(
  a: { x: number; y: number },
  b: { x: number; y: number },
  hand: "left" | "right",
) {
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const vertical = Math.abs(ty) >= Math.abs(tx);
  let x = vertical ? ty : -ty;
  let y = vertical ? -tx : tx;
  if (hand === "right") {
    x = -x;
    y = -y;
  }
  return { x, y };
}

/**
 * A 20m half circle from B to E or E to B. The hand is the rein.
 * Left at B is already going toward C, so the arc stays on the C side.
 * Left at E is already going toward A, so the arc stays on the A side.
 * Right is the other side.
 */
export function acrossHalfSide(
  from: string,
  to: string,
  hand: "left" | "right",
): "A" | "C" | undefined {
  const across = (from === "B" && to === "E") || (from === "E" && to === "B");
  if (!across) return undefined;
  if (from === "B") return hand === "left" ? "C" : "A";
  return hand === "left" ? "A" : "C";
}

function sweepTowardEnd(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rx: number,
  ry: number,
  end: "A" | "C",
): 0 | 1 {
  const midY = (a.y + b.y) / 2;
  const score = (c: { y: number }) => (end === "A" ? 1 : -1) * (c.y - midY);
  return score(arcCrown(a, b, rx, ry, 1)) > score(arcCrown(a, b, rx, ry, 0)) ? 1 : 0;
}

export function halfArc(
  from: string,
  to: string,
  bulge: "C" | "A",
  hand?: "left" | "right",
  travel?: "A" | "C",
): string {
  const a = track(from);
  const b = track(to);
  // Diameter is the whole chord, so a vertical half circle is the same size as a horizontal one.
  const metres = Math.hypot((b.x - a.x) / geom.mPx.x, (b.y - a.y) / geom.mPx.y);
  const rx = Math.max(8, (metres / 2) * geom.mPx.x);
  const ry = Math.max(8, (metres / 2) * geom.mPx.y);
  const ontoCentre = CENTRE_LETTERS.has(to) && Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
  const across = hand ? acrossHalfSide(from, to, hand) : undefined;
  let sweep: 0 | 1;
  if (across) {
    sweep = sweepTowardEnd(a, b, rx, ry, across);
  } else if (travel && ontoCentre) {
    // The horse keeps going the way it was already travelling. Toward A is below the line.
    sweep = sweepTowardEnd(a, b, rx, ry, travel);
  } else if (hand) {
    const want = handOffset(a, b, hand);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const score = (c: { x: number; y: number }) => (c.x - mid.x) * want.x + (c.y - mid.y) * want.y;
    sweep = score(arcCrown(a, b, rx, ry, 1)) > score(arcCrown(a, b, rx, ry, 0)) ? 1 : 0;
  } else {
    // Historical mapping. On a left-to-right chord, sweep 1 actually bends toward C;
    // the caller still names the end it wants, and we honour that when the other
    // sweep would leave the arena.
    sweep = bulge === "A" ? 1 : 0;
    const crown = arcCrown(a, b, rx, ry, sweep);
    const outside =
      crown.x < geom.left - 1 ||
      crown.x > geom.right + 1 ||
      crown.y < geom.top - 1 ||
      crown.y > geom.bot + 1;
    if (outside) {
      const flipped = arcCrown(a, b, rx, ry, sweep === 0 ? 1 : 0);
      const flippedOutside =
        flipped.x < geom.left - 1 ||
        flipped.x > geom.right + 1 ||
        flipped.y < geom.top - 1 ||
        flipped.y > geom.bot + 1;
      if (!flippedOutside) sweep = sweep === 0 ? 1 : 0;
    }
  }
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 ${sweep} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Half circle from E/B to X, then the straight return to H/M. */
export function returningHalfArc(
  from: string,
  returnTo: string,
  bulge: "C" | "A",
  travel?: "A" | "C",
): string {
  const end = track(returnTo);
  return `${halfArc(from, "X", bulge, undefined, travel)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

/** Quadratic loop through X at its midpoint, rather than merely towards X. */
export function loopPath(from: string, to: string, via = "X"): string {
  const a = track(from);
  const b = track(to);
  const p = track(via);
  const control = { x: 2 * p.x - (a.x + b.x) / 2, y: 2 * p.y - (a.y + b.y) / 2 };
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/**
 * Equal loops from C to A or A to C. Each loop is a round arc of the loop's
 * own length (20m for three loops of a 60m arena) that touches one long side.
 * Short straights, parallel to the short side, cross the centre line between loops.
 * `first` is the long side the opening loop touches.
 */
export function serpentinePath(
  from: "C" | "A",
  first: "left" | "right",
  loops = 3,
  to?: "X",
): string {
  const y0 = from === "C" ? geom.top : geom.bot;
  const y1 = to === "X" ? track("X").y : from === "C" ? geom.bot : geom.top;
  const span = (y1 - y0) / loops;
  const firstSign = first === "left" ? -1 : 1;
  const halfW = geom.right - geom.cx;
  // About 2m across, shorter when a loop has little width left.
  const cross = Math.min(2 * geom.mPx.x, halfW * 0.28);
  const f = (n: number) => n.toFixed(1);
  let d = "";
  for (let i = 0; i < loops; i++) {
    const startY = y0 + span * i;
    const endY = y0 + span * (i + 1);
    const sign = i % 2 === 0 ? firstSign : -firstSign;
    const touchX = geom.cx + sign * halfW;
    const xStart = geom.cx + sign * (i === 0 ? 0 : cross);
    const xEnd = geom.cx + sign * (i === loops - 1 ? 0 : cross);
    const midX = (xStart + xEnd) / 2;
    const rx = Math.max(8, Math.abs(touchX - midX));
    const ry = Math.max(8, Math.abs(endY - startY) / 2);
    const c0 = arcCrown({ x: xStart, y: startY }, { x: xEnd, y: endY }, rx, ry, 0);
    const c1 = arcCrown({ x: xStart, y: startY }, { x: xEnd, y: endY }, rx, ry, 1);
    const sweep = Math.abs(c0.x - touchX) <= Math.abs(c1.x - touchX) ? 0 : 1;
    if (i === 0) d = `M ${f(xStart)} ${f(startY)}`;
    else d += ` L ${f(xStart)} ${f(startY)}`;
    d += ` A ${f(rx)} ${f(ry)} 0 0 ${sweep} ${f(xEnd)} ${f(endY)}`;
  }
  return d;
}

/** Shallow loop whose apex sits `metres` in from the track, toward the arena centre. */
export function insetLoopPath(from: string, to: string, metres: number): string {
  const a = track(from);
  const b = track(to);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const inward = { x: geom.cx - mid.x, y: (geom.top + geom.bot) / 2 - mid.y };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const pxPerM = Math.abs(inward.x) >= Math.abs(inward.y) ? geom.mPx.x : geom.mPx.y;
  const apex = {
    x: mid.x + (inward.x / len) * metres * pxPerM,
    y: mid.y + (inward.y / len) * metres * pxPerM,
  };
  const control = { x: 2 * apex.x - mid.x, y: 2 * apex.y - mid.y };
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Small working-pirouette arc, the same size as the at-G haunches turn. */
/** Quarter-pirouette: a 90° arc at `at`, entered from `from` and aimed toward `aim`. */
export function quarterTurnPath(
  at: string,
  from: string,
  aim: string,
  direction: "left" | "right",
) {
  const p = track(at);
  const a = track(from);
  let ix = p.x - a.x;
  let iy = p.y - a.y;
  const il = Math.hypot(ix, iy) || 1;
  ix /= il;
  iy /= il;
  // Clockwise in this y-down arena is a right turn.
  const exit = direction === "right" ? { x: -iy, y: ix } : { x: iy, y: -ix };
  const r = 1.5 * geom.mPx.x;
  const start = { x: p.x - ix * r, y: p.y - iy * r };
  const end = { x: p.x + exit.x * r, y: p.y + exit.y * r };
  const sweep = direction === "right" ? 1 : 0;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweep} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

/** Half-pirouette of `diameterM` metres on the line from `from` to `to`. */
export function halfPirouettePath(
  from: string,
  to: string,
  along: number,
  direction: "left" | "right",
  diameterM = 2,
) {
  const p = pointOn(from, to, along);
  const a = track(from);
  const b = track(to);
  let ix = b.x - a.x;
  let iy = b.y - a.y;
  const il = Math.hypot(ix, iy) || 1;
  ix /= il;
  iy /= il;
  const r = (diameterM / 2) * geom.mPx.x;
  const start = { x: p.x - ix * r, y: p.y - iy * r };
  const end = { x: p.x + ix * r, y: p.y + iy * r };
  const sweep = direction === "right" ? 1 : 0;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweep} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

export function pirouettePath(at: string, direction: "left" | "right"): string {
  const p = track(at);
  const r = 10;
  const sweep = direction === "left" ? 1 : 0;
  if (Math.abs(p.x - geom.cx) < 1) {
    return `M ${(p.x - r).toFixed(1)} ${p.y.toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${(p.x + r).toFixed(1)} ${p.y.toFixed(1)}`;
  }
  const bulge = p.x < geom.cx ? 0 : 1;
  return `M ${p.x.toFixed(1)} ${(p.y - r).toFixed(1)} A ${r} ${r} 0 0 ${bulge} ${p.x.toFixed(1)} ${(p.y + r).toFixed(1)}`;
}

/** Centre-line zigzag of `legs` half-passes, each `sideM` metres off the centre. */
export function zigzagPath(
  from: string,
  to: string,
  legs: number,
  sideM: number,
  start: "left" | "right",
) {
  const a = track(from);
  const b = track(to);
  const reach = sideM * geom.mPx.x;
  const sign0 = start === "right" ? 1 : -1;
  const pts = [`M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`];
  for (let i = 1; i <= legs; i++) {
    const peakT = (i - 0.5) / legs;
    const endT = i / legs;
    const sign = sign0 * (i % 2 === 1 ? 1 : -1);
    const peak = {
      x: a.x + (b.x - a.x) * peakT + sign * reach,
      y: a.y + (b.y - a.y) * peakT,
    };
    const end = { x: a.x + (b.x - a.x) * endT, y: a.y + (b.y - a.y) * endT };
    pts.push(
      `L ${peak.x.toFixed(1)} ${peak.y.toFixed(1)}`,
      `L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

export function arcPath(from: string, to: string, bulge: "C" | "A") {
  const a = track(from),
    b = track(to);
  return `M ${a.x} ${a.y} A ${10 * geom.mPx.x} ${10 * geom.mPx.y} 0 0 ${bulge === "C" ? 1 : 0} ${b.x} ${b.y}`;
}

/**
 * Half-turn on the haunches beside G.
 * The horse is walking across the arena through G. `side` is the letter it is
 * walking toward when the turn starts (H = right turn, M = left turn).
 * Hindquarters stay on that line, a couple of metres off the centre line, and
 * the forehand walks a small semicircle into the arena. This is not a half-circle
 * out to the rail.
 */
export function haunchesTurn(side: "H" | "M") {
  const g = track("G");
  const sign = side === "H" ? -1 : 1;
  const radius = 10;
  const reach = 13;
  const pivot = { x: g.x + sign * reach, y: g.y };
  const arcStart = { x: pivot.x - sign * radius, y: g.y };
  const arcEnd = { x: pivot.x + sign * radius, y: g.y };
  const crown = { x: pivot.x, y: g.y + radius };
  return { g, sign, radius, reach, pivot, arcStart, arcEnd, crown };
}

export function halfTurnPath(side: "H" | "M") {
  const t = haunchesTurn(side);
  const f = (n: number) => n.toFixed(1);
  // Travel reverses between the two turns, so the sweep that bulges toward A flips.
  const sweep = side === "H" ? 1 : 0;
  return [
    `M ${f(t.g.x)} ${f(t.g.y)}`,
    `L ${f(t.arcStart.x)} ${f(t.arcStart.y)}`,
    `A ${f(t.radius)} ${f(t.radius)} 0 0 ${sweep} ${f(t.arcEnd.x)} ${f(t.arcEnd.y)}`,
    `L ${f(t.g.x)} ${f(t.g.y)}`,
  ].join(" ");
}

export type LateralTick = {
  centre: { x: number; y: number };
  from: { x: number; y: number };
  to: { x: number; y: number };
  nose: { x: number; y: number };
  tip: { x: number; y: number };
};

/** The angled body-axis hatches used by ESNZ, with a subtle directional tip. */
export function lateralWork(
  points: readonly { x: number; y: number }[],
  kind: "shoulder-in" | "travers" | "renvers" | "half-pass" | "leg-yield",
  direction: "left" | "right",
): LateralTick[] {
  const segments = points
    .slice(1)
    .map((b, i) => ({ a: points[i], b, length: Math.hypot(b.x - points[i].x, b.y - points[i].y) }))
    .filter((s) => s.length > 1e-8);
  const total = segments.reduce((sum, s) => sum + s.length, 0);
  if (total < 3) return [];
  const diagonal = kind === "half-pass" || kind === "leg-yield",
    halfLength = diagonal ? 7.5 : 8;
  // All bodies use a forward-pointing diagonal; the bend determines which 45° axis.
  const first = segments[0],
    ux = (first.b.x - first.a.x) / first.length,
    uy = (first.b.y - first.a.y) / first.length;
  const halfAngle = diagonal ? Math.PI / 4 : Math.PI / 6;
  const offset = diagonal
    ? ux >= 0
      ? -halfAngle
      : halfAngle
    : (direction === "right" ? 1 : -1) * halfAngle;
  const angle = Math.atan2(uy, ux) + offset,
    vx = Math.cos(angle),
    vy = Math.sin(angle);
  // Clearance is perpendicular to travel. Do not return a body tip beyond an end letter.
  const normalReach = halfLength + 2.5 * Math.abs(uy) + 3.6;
  const edge = diagonal
    ? Math.max(10, normalReach / Math.max(Math.abs(uy), 0.1))
    : Math.min(10, total / 10);
  const count = Math.max(2, Math.round((total - 2 * edge) / 18) + 1),
    interval = (total - 2 * edge) / (count - 1);
  return Array.from({ length: count }, (_, j) => {
    let distance = edge + j * interval,
      i = 0;
    while (i < segments.length - 1 && distance > segments[i].length) {
      distance -= segments[i].length;
      i++;
    }
    const { a, b, length } = segments[i],
      ux = (b.x - a.x) / length,
      uy = (b.y - a.y) / length;
    const centre = { x: a.x + ux * distance, y: a.y + uy * distance };
    // Shift the body, not its placement foot, into the arena. Preserve all 16px at 30°.
    const inward = centre.x < geom.cx ? 1 : -1;
    const inset = diagonal ? 0 : inward * halfLength * Math.abs(vx);
    const from = { x: centre.x + inset - vx * halfLength, y: centre.y - vy * halfLength };
    const nose = { x: centre.x + inset + vx * halfLength, y: centre.y + vy * halfLength };
    const tipClearance = 2.5;
    const tip = { x: nose.x - uy * tipClearance, y: nose.y + ux * tipClearance };
    // Renvers points the nose at the wall. Slide the whole tick inward until the tip is inside.
    const xs = [from.x, nose.x, tip.x];
    const overflowLeft = Math.max(0, geom.left - Math.min(...xs));
    const overflowRight = Math.max(0, Math.max(...xs) - geom.right);
    if (overflowLeft > 0 || overflowRight > 0) {
      const shift = (overflowLeft > 0 ? 1 : -1) * ((overflowLeft || overflowRight) + 0.6);
      from.x += shift;
      nose.x += shift;
      tip.x += shift;
    }
    return { centre, from, nose, to: nose, tip };
  });
}

/** The explicit segment endpoints—never the perimeter shortcut between two rail letters. */
export function lateralWorkPoints(ids: readonly string[]) {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i < ids.length; i++) {
    const next = [track(ids[i - 1]), track(ids[i])];
    points.push(...(i === 1 ? next : next.slice(1)));
  }
  return points;
}

export function lateralWorkPath(
  ids: readonly string[],
  kind: "shoulder-in" | "travers" | "renvers" | "half-pass" | "leg-yield",
  direction: "left" | "right",
) {
  return lateralWork(lateralWorkPoints(ids), kind, direction)
    .map(
      (t) =>
        `M ${t.from.x.toFixed(2)} ${t.from.y.toFixed(2)} L ${t.to.x.toFixed(2)} ${t.to.y.toFixed(2)} M ${t.tip.x.toFixed(2)} ${t.tip.y.toFixed(2)} L ${t.nose.x.toFixed(2)} ${t.nose.y.toFixed(2)}`,
    )
    .join(" ");
}
