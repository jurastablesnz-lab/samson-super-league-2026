import type { Collective, Draw, Movement, Pace } from "../types.ts";

export const INTRO_COLLECTIVES: Collective[] = [
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
      "Willing cooperation, harmony, attention and confidence; acceptance of bit and aids, straightness, lightness of the forehand and ease of movements",
    coeff: 2,
  },
  {
    name: "Rider's position and seat, correctness and effective use of the aids",
    detail: "Clarity, subtlety, independence, accuracy of test",
    coeff: 2,
  },
];

export const INTRO_PURPOSE =
  "To introduce the rider and/or horse to the sport of dressage, confirming that they are beginning to develop an understanding of correct dressage basics. The horse should be ridden freely forward in a steady tempo and clear rhythm, accepting contact with the bit. An understanding of test accuracy and geometry should be demonstrated.";

export const INTRO_INTRODUCES =
  "Free walk, medium walk, working trot rising, 20 meter circle, halt through walk, working canter 20 metre circle";

export const INTRO_INSTRUCTIONS =
  "To be ridden in a snaffle. All trot to be ridden rising. Transitions from walk to trot and trot to walk may be performed through sitting trot with the objective of performing a smooth transition. Turns from centre line to long side and long side to centre line should be ridden as a half circle, touching the track at a point midway between the centre line and the corner, and vice versa. Horses should be ridden on a light but steady contact, with the exception of the free walk in which the horse is allowed complete freedom to stretch neck forward and downward. Halts may be through walk.";

export const ARENA = "60 × 20 or 40 × 20";
export const LEAVE = "Leave arena in walk on a long rein at A";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string): Draw => ({ t: "circle", at, m: 20 });
export const halt = (at: string): Draw => ({ t: "halt", at });

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
