import type { Collective, SetTest } from "./tests/types.ts";
export * from "./tests/types.ts";
export { TEST_2A } from "./tests/level-2/novice-2A.ts";
export { TEST_2B } from "./tests/level-2/novice-2B.ts";
export { TEST_2C } from "./tests/level-2/novice-2C.ts";
export { SET_TESTS, MFS_SHEET } from "./tests/level-2/index.ts";

export const COLLECTIVES: Collective[] = [
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
    name: "Rider",
    detail:
      "Position and seat; correctness and effective use of the aids (clarity, subtlety, independence, accuracy of test)",
    coeff: 2,
  },
];

export const NOVICE_PURPOSE =
  "To confirm that the horse demonstrates correct basics, and in addition to the requirements of Preliminary Level, has developed the thrust to achieve improved balance and throughness and maintains a more consistent contact with the bit.";

export const NOVICE_INSTRUCTIONS =
  "To be ridden in a snaffle. All trot sitting or rising unless stated otherwise.";

export type TestTabId = "2a" | "2b" | "2c" | "mfs";

export function marksFor(test: SetTest) {
  const tech = test.movements.reduce((n, m) => n + 10 * (m.coeff ?? 1), 0);
  const coll = COLLECTIVES.reduce((n, c) => n + 10 * c.coeff, 0);
  return { tech, coll, total: tech + coll };
}
