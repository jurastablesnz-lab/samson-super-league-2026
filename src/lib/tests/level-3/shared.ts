import type { Collective, Draw, Lateral, Movement, Pace } from "../types.ts";

export const ELEMENTARY_COLLECTIVES: Collective[] = [
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

export const ELEMENTARY_PURPOSE =
  "To confirm that the horse demonstrates correct basics, and having achieved the thrust required in Novice, now accepts more weight on the hindquarters (collection); moves with an uphill tendency, especially in the medium paces; and is reliably on the bit. A greater degree of straightness, bending, suppleness, throughness, balance and self carriage is required than at Novice Level.";

export const ELEMENTARY_INSTRUCTIONS =
  "To be ridden in a snaffle. All trot sitting unless specified otherwise.";

export const LEAVE = "Leave arena in walk on a long rein at A";
export const DRAW = "8:00";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string): Draw => ({ t: "circle", at, m: 10 });
export const half = (from: string, to: string, bulge: "C" | "A"): Draw => ({
  t: "half",
  from,
  to,
  bulge,
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
export const serpentine = (from: "C" | "A", first: "left" | "right"): Draw => ({
  t: "serpentine",
  from,
  first,
});

export const ELEMENTARY_ENTER: Movement = {
  n: 1,
  steps: [
    { at: "A", do: "Enter in collected trot" },
    { at: "X", do: "Halt, Salute" },
    { at: "", do: "Proceed in collected trot" },
  ],
  directive:
    "Engagement, uphill balance and quality of trot; clear balanced transitions; straightness, attentiveness; immobility (min. 3 secs)",
  draw: [line(["A", "X", "C"]), halt("X")],
};

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
