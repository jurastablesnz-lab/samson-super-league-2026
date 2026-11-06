/** 60 × 20 schematic. A at the bottom. Length is compressed to fit a phone. */

export const CX = 110;
export const LEFT = 50;
export const RIGHT = 170;
export const TOP = 28;
export const BOT = 244;
export const CORNER_RX = 22;
export const CORNER_RY = 13.5;

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
  if (EXTRA[id]) return EXTRA[id];
  const y = Y[id] ?? 134;
  if (LEFTS.has(id)) return { x: LEFT, y };
  if (RIGHTS.has(id)) return { x: RIGHT, y };
  return { x: CX, y };
}

export function label(id: string): { x: number; y: number } {
  const y = Y[id] ?? 134;
  if (LEFTS.has(id)) return { x: 36, y };
  if (RIGHTS.has(id)) return { x: 184, y };
  if (id === "C") return { x: CX, y: 14 };
  if (id === "A") return { x: CX, y: 256 };
  return { x: CX, y };
}

export function isRail(id: string) {
  return RAIL.has(id);
}

export function circleCenter(
  at: string,
  m: number,
  side?: "left" | "right",
): { x: number; y: number } {
  const p = track(at);
  if (at === "C") return { x: CX, y: TOP + m * M_PX.y };
  if (at === "A") return { x: CX, y: BOT - m * M_PX.y };
  if (side) return { x: CX + (side === "left" ? -1 : 1) * m * M_PX.x, y: p.y };
  if (LEFTS.has(at)) return { x: LEFT + m * M_PX.x, y: p.y };
  if (RIGHTS.has(at)) return { x: RIGHT - m * M_PX.x, y: p.y };
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
  return RAIL_POSITIONS[id] ?? 0;
}

function wrap(t: number) {
  const p = PERIM;
  return ((t % p) + p) % p;
}

function pointOnSharp(t: number): { x: number; y: number } {
  t = wrap(t);
  if (t < HW) return { x: CX + t, y: BOT };
  t -= HW;
  if (t < H) return { x: RIGHT, y: BOT - t };
  t -= H;
  if (t < W) return { x: RIGHT - t, y: TOP };
  t -= W;
  if (t < H) return { x: LEFT, y: TOP + t };
  t -= H;
  return { x: LEFT + t, y: BOT };
}

function roundCorner(p: { x: number; y: number }): { x: number; y: number } {
  const rx = CORNER_RX;
  const ry = CORNER_RY;
  const corners = [
    { cx: RIGHT - rx, cy: BOT - ry, sx: 1, sy: 1 },
    { cx: RIGHT - rx, cy: TOP + ry, sx: 1, sy: -1 },
    { cx: LEFT + rx, cy: TOP + ry, sx: -1, sy: -1 },
    { cx: LEFT + rx, cy: BOT - ry, sx: -1, sy: 1 },
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

export function halfArc(from: string, to: string, bulge: "C" | "A"): string {
  const a = track(from);
  const b = track(to);
  const rx = Math.max(8, Math.abs(b.x - a.x) / 2);
  const ry = Math.max(8, rx * (M_PX.y / M_PX.x));
  // SVG sweep 1 is clockwise in screen space, which bulges toward A (down) on a horizontal chord.
  const sweep = bulge === "A" ? 1 : 0;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 ${sweep} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Half circle from E/B to X, then the straight return to H/M. */
export function returningHalfArc(from: string, returnTo: string, bulge: "C" | "A"): string {
  const end = track(returnTo);
  return `${halfArc(from, "X", bulge)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

/** Quadratic loop through X at its midpoint, rather than merely towards X. */
export function loopPath(from: string, to: string, via = "X"): string {
  const a = track(from);
  const b = track(to);
  const p = track(via);
  const control = { x: 2 * p.x - (a.x + b.x) / 2, y: 2 * p.y - (a.y + b.y) / 2 };
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export function arcPath(from: string, to: string, bulge: "C" | "A") {
  const a = track(from),
    b = track(to);
  return `M ${a.x} ${a.y} A ${10 * M_PX.x} ${10 * M_PX.y} 0 0 ${bulge === "C" ? 1 : 0} ${b.x} ${b.y}`;
}

export function halfTurnPath(to: "H" | "M") {
  const p = track(to),
    g = track("G"),
    sign = to === "H" ? -1 : 1;
  return `M ${g.x} ${g.y} L ${g.x + sign * 18} ${g.y} Q ${g.x + sign * 18} ${g.y + 24} ${g.x} ${g.y + 18} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
}
