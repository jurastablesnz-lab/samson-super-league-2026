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

export function circleCenter(at: string, m: number): { x: number; y: number } {
  const p = track(at);
  if (at === "C") return { x: CX, y: TOP + m * M_PX.y };
  if (at === "A") return { x: CX, y: BOT - m * M_PX.y };
  if (LEFTS.has(at)) return { x: LEFT + m * M_PX.x, y: p.y };
  if (RIGHTS.has(at)) return { x: RIGHT - m * M_PX.x, y: p.y };
  return p;
}

const HW = RIGHT - CX;
const W = RIGHT - LEFT;
const H = BOT - TOP;
export const PERIM = 2 * (W + H);

/** Clockwise distance from A along the sharp rectangle. */
export function railParam(id: string): number {
  const { x, y } = track(id);
  if (Math.abs(x - RIGHT) < 2.5) return HW + (BOT - y);
  if (Math.abs(y - TOP) < 2.5) return HW + H + (RIGHT - x);
  if (Math.abs(x - LEFT) < 2.5) return HW + H + W + (y - TOP);
  if (x >= CX - 1) return x - CX;
  return HW + H + W + H + (x - LEFT);
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
