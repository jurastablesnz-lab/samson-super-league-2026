import type { Collective, Draw, Lateral, Movement, Pace } from "../types.ts";

export const GRADE_V_COLLECTIVES: Collective[] = [
  {
    name: "General impression",
    detail:
      "Harmonious presentation of the athlete/horse combination; equestrian feel and skill of the athlete, discreet and effective influence of the aids; accuracy",
    coeff: 2,
  },
];

export const GRADE_V_PURPOSE =
  "FEI Para Dressage Grade V. Movements are performed in walk, trot with lateral work, and canter with lateral work. Championship medals use Grand Prix A for the individual, Grand Prix B for the team, and the Grand Prix Freestyle.";

export const GRADE_V_INSTRUCTIONS =
  "20 × 60 arena. Minimum age of horse: 6 years. Time 5:30 is for information only.";

export const LEAVE = "Leave arena at A in walk on a long rein";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string, m: 8 | 10 | 20 = 10): Draw => ({ t: "circle", at, m });
export const half = (from: string, to: string, bulge: "C" | "A", travel?: "A" | "C"): Draw => ({
  t: "half",
  from,
  to,
  bulge,
  ...(travel ? { travel } : {}),
});
export const halt = (at: string): Draw => ({ t: "halt", at });
export const reinBack = (at: string, steps = 4): Draw => ({ t: "rein-back", at, steps });
export const change = (at: string): Draw => ({ t: "change", at });
export const halfPirouette = (
  from: string,
  to: string,
  along: number,
  direction: "left" | "right",
  diameterM = 3,
): Draw => ({ t: "pirouette", direction, turn: "half", from, to, along, diameterM });

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
