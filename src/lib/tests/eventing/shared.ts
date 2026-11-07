import type { Collective, Draw, Lateral, Movement, Pace } from "../types.ts";

/** Eventing sheets mark all four collectives at coefficient 1. */
export const EVENTING_COLLECTIVES: Collective[] = [
  { name: "Paces", detail: "Freedom and regularity", coeff: 1 },
  {
    name: "Impulsion",
    detail:
      "Desire to move forward, elasticity of the steps, suppleness of the back and engagement of the hindquarters",
    coeff: 1,
  },
  {
    name: "Submission",
    detail:
      "Attention and confidence; harmony, lightness and ease of the movements; acceptance of the bridle and lightness of the forehand",
    coeff: 1,
  },
  {
    name: "Rider",
    detail: "Position and seat of the rider, correct use of the aids",
    coeff: 1,
  },
];

export const SITTING_OR_RISING =
  "The trot may be executed sitting or rising unless the test specifies otherwise. Ordinary snaffle. CCN65 and CCN80 may be commanded; every other class is ridden from memory.";

export const SITTING_UNLESS_RISING =
  "All trot is sitting unless the movement says rising. Ordinary snaffle.";

export const SITTING_OR_DOUBLE =
  "Working, medium and extended trot are sitting unless the movement says rising. Ordinary snaffle or simple double bridle.";

const RAIL_40 = ["A", "F", "B", "M", "C", "H", "E", "K"] as const;
const RAIL_60 = ["A", "F", "P", "B", "R", "M", "C", "H", "S", "E", "V", "K"] as const;

/**
 * Letters along one rein. Track left is A–F–B–M–C–H–E–K–A
 * (C to H). Track right is the other way (C to M).
 */
export function along(
  from: string,
  to: string,
  rein: "left" | "right",
  arena: "40" | "60",
): string[] {
  const rail: readonly string[] = arena === "40" ? RAIL_40 : RAIL_60;
  const i = rail.indexOf(from);
  const j = rail.indexOf(to);
  if (i < 0 || j < 0) return [from, to];
  const n = rail.length;
  const step = rein === "left" ? 1 : -1;
  const pts = [rail[i]];
  let k = i;
  while (rail[k] !== to) {
    k = (k + step + n) % n;
    pts.push(rail[k]);
    if (pts.length > n) break;
  }
  return [...pts];
}

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string, m: 8 | 10 | 12 | 15 | 20): Draw => ({ t: "circle", at, m });
export const half = (from: string, to: string, bulge: "C" | "A"): Draw => ({
  t: "half",
  from,
  to,
  bulge,
});
export const halt = (at: string): Draw => ({ t: "halt", at });
export const reinBack = (at: string): Draw => ({ t: "rein-back", at });
export const changeOn = (from: string, to: string, alongAt: number): Draw => ({
  t: "change",
  from,
  to,
  along: alongAt,
});
export const loop = (from: string, to: string, insetM = 10): Draw => ({
  t: "loop",
  from,
  to,
  insetM,
});
export const serpentine = (
  from: "C" | "A",
  first: "left" | "right",
  loops = 3,
  to?: "X",
): Draw => ({
  t: "serpentine",
  from,
  first,
  ...(loops === 3 ? {} : { loops }),
  ...(to ? { to } : {}),
});
export const halfPirouette = (
  from: string,
  to: string,
  alongAt: number,
  direction: "left" | "right",
): Draw => ({
  t: "pirouette",
  turn: "half",
  from,
  to,
  along: alongAt,
  direction,
  diameterM: 3,
});

export function mv(
  n: number,
  steps: [string, string][],
  directive: string,
  draw: Draw | Draw[],
  opt?: { pace?: Pace; coeff?: 2; lateral?: Lateral },
): Movement {
  return {
    n,
    steps: steps.map(([at, text]) => ({ at, do: text })),
    directive,
    draw: Array.isArray(draw) ? draw : [draw],
    ...(opt?.coeff ? { coeff: opt.coeff } : {}),
    ...(opt?.pace ? { pace: opt.pace } : {}),
    ...(opt?.lateral ? { lateral: opt.lateral } : {}),
  };
}

export function lat(
  kind: Lateral["kind"],
  direction: Lateral["direction"],
  from: string,
  to: string,
): Lateral {
  return { kind, direction, from, to };
}
