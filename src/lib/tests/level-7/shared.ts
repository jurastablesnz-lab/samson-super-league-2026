import type { Collective, Draw, Movement, Pace } from "../types.ts";

export const FEI_COLLECTIVES: Collective[] = [
  {
    name: "Harmony",
    detail:
      "Harmony, cooperation, lightness, effectiveness and sensitivity of the aids, and adherence to the training scale",
    coeff: 2,
  },
];

export const LEAVE = "Leave arena at A in walk on a long rein";

export const line = (pts: string[]): Draw => ({ t: "line", pts });
export const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
export const circle = (at: string, m: 8 | 10 | 20): Draw => ({ t: "circle", at, m });
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
export const changes = (from: string, to: string, along: number[]): Draw[] =>
  along.map((t) => changeOn(from, to, t));
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
): Draw => ({
  t: "pirouette",
  direction,
  turn: "full",
  from,
  to,
  along,
  diameterM: 3,
});

export function mv(
  n: number,
  steps: [string, string][],
  directive: string,
  draw: Draw | Draw[],
  opt?: { pace?: Pace; coeff?: 2 },
): Movement {
  const movement: Movement = {
    n,
    steps: steps.map(([at, text]) => ({ at, do: text })),
    directive,
    draw: Array.isArray(draw) ? draw : [draw],
    ...(opt?.coeff ? { coeff: opt.coeff } : {}),
    ...(opt?.pace ? { pace: opt.pace } : {}),
  };
  return movement;
}

export function halfPass(
  movement: Movement,
  direction: "left" | "right",
  from: string,
  to: string,
): Movement {
  return { ...movement, lateral: { kind: "half-pass", direction, from, to } };
}

export function shoulder(
  movement: Movement,
  direction: "left" | "right",
  from: string,
  to: string,
): Movement {
  return { ...movement, lateral: { kind: "shoulder-in", direction, from, to } };
}
