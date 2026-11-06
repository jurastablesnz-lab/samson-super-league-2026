import type { Collective, Draw, Movement, Pace } from "../types.ts";

export const PRELIM_COLLECTIVES: Collective[] = [
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

export const PRELIM_PURPOSE =
  "To confirm that the horse demonstrates correct basics, by showing suppleness both laterally and longitudinally, moving freely forward in a clear rhythm with a steady tempo and readily accepting contact with the bit. Correct geometry and lines of travel should be shown.";

export const PRELIM_INSTRUCTIONS =
  "To be ridden in a snaffle. All trot work may be sitting or rising unless stated otherwise. Halts may be through the walk.";

export const ARENA = "60 × 20 or 40 × 20";
export const LEAVE = "Leave arena in walk on a long rein at A";
export const DRAW = "8:00 (60×20) or 7:00 (40×20)";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string): Draw => ({ t: "circle", at, m: 20 });
export const halt = (at: string): Draw => ({ t: "halt", at });
export const stretch = (at: string): Draw => ({ t: "stretch", at });
export const loop = (from: string, to: string): Draw => ({ t: "loop", from, to });
export const shallow = (from: string, to: string): Draw => ({
  t: "loop",
  from,
  to,
  insetM: 5,
});

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
