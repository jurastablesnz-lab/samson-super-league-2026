import type { Collective, Draw, Lateral, Movement, Pace } from "../types.ts";

export const ADVANCED_MEDIUM_COLLECTIVES: Collective[] = [
  { name: "Paces", detail: "Freedom and regularity", coeff: 1 },
  {
    name: "Impulsion",
    detail:
      "Desire to move forward, elasticity of the steps, relaxation of the back and engagement of the hindquarters",
    coeff: 1,
  },
  {
    name: "Submission",
    detail:
      "Willing cooperation, harmony, attention and confidence; acceptance of bit and aids, straightness, lightness of the forehand and ease of movements",
    coeff: 2,
  },
  {
    name: "Rider's position and seat; correctness and effective use of the aids",
    detail: "Clarity, subtlety, independence, accuracy of test",
    coeff: 2,
  },
];

export const ADVANCED_MEDIUM_PURPOSE =
  "To confirm that the horse demonstrates correct basics, while maintaining consistent uphill balance and self-carriage. Increased engagement facilitates clear differences in collected, medium, and extended paces with well-defined, balanced transitions. Movements should be accomplished with harmony and ease due to the increased balance and collection. The horse must demonstrate a greater degree of throughness, suppleness and bending than at Medium Level.";

export const ADVANCED_MEDIUM_INSTRUCTIONS =
  "To be ridden in a snaffle or a double bridle. All trot sitting.";

export const LEAVE = "Leave arena in walk on a long rein at A";
export const DRAW = "8:00";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string, m: 10 | 20 = 10): Draw => ({ t: "circle", at, m });
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
export const turn = (side: "H" | "M"): Draw => ({ t: "half-turn", at: "G", side });
export const yieldTo = (from: string, to: string): Draw => ({ t: "yield", from, to });

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
