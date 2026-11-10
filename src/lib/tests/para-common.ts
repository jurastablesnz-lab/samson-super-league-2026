import type { Collective, Draw, Lateral, Movement, Pace } from "./types.ts";

export const PARA_COLLECTIVES: Collective[] = [
  {
    name: "General impression",
    detail:
      "Harmonious presentation of the athlete/horse combination; equestrian feel and skill of the athlete, discreet and effective influence of the aids; accuracy",
    coeff: 2,
  },
];

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string, m: 8 | 10 | 20): Draw => ({ t: "circle", at, m });
export const half = (
  from: string,
  to: string,
  bulge: "C" | "A",
  hand?: "left" | "right",
): Draw => ({
  t: "half",
  from,
  to,
  bulge,
  ...(hand ? { hand } : {}),
});
export const halt = (at: string): Draw => ({ t: "halt", at });
export const reinBack = (at: string): Draw => ({ t: "rein-back", at });
export const change = (at: string): Draw => ({ t: "change", at });
export const changeOn = (from: string, to: string, along: number): Draw => ({
  t: "change",
  from,
  to,
  along,
});
export const serpentine = (from: "C" | "A", first: "left" | "right", loops?: number): Draw => ({
  t: "serpentine",
  from,
  first,
  ...(loops && loops !== 3 ? { loops } : {}),
});
export const halfPirouette = (
  from: string,
  to: string,
  along: number,
  direction: "left" | "right",
  diameterM = 3,
): Draw => ({ t: "pirouette", direction, turn: "half", from, to, along, diameterM });
export const fullPirouette = (
  from: string,
  to: string,
  along: number,
  direction: "left" | "right",
): Draw => ({ t: "pirouette", direction, turn: "full", from, to, along, diameterM: 3 });

export function mv(
  n: number,
  steps: [string, string][],
  directive: string,
  draw: Draw | Draw[],
  opt?: { pace?: Pace; coeff?: 2 },
): Movement {
  return {
    n,
    steps: steps.map(([at, text]) => ({ at, do: text })),
    directive,
    draw: Array.isArray(draw) ? draw : [draw],
    ...(opt?.coeff ? { coeff: opt.coeff } : {}),
    ...(opt?.pace ? { pace: opt.pace } : {}),
  };
}

export function lateral(
  movement: Movement,
  kind: Lateral["kind"],
  direction: Lateral["direction"],
  from: string,
  to: string,
): Movement {
  return { ...movement, lateral: { kind, direction, from, to } };
}
