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

export {
  COLLECTIVES as MEDIUM_COLLECTIVES,
  MEDIUM_PURPOSE,
  MEDIUM_INSTRUCTIONS,
  MEDIUM_ENTER,
} from "./tests/medium.ts";
export { TEST_4A, TEST_4B, TEST_4C, SET_4_TESTS, MEDIUM_FS } from "./tests/level-4/index.ts";
export { TEST_0A, TEST_0B, TEST_0C, TEST_0D, SET_0_TESTS } from "./tests/level-0/index.ts";
export { TEST_1A, TEST_1B, TEST_1C, TEST_1D, SET_1_TESTS } from "./tests/level-1/index.ts";
export {
  TEST_3A,
  TEST_3B,
  TEST_3C,
  SET_3_TESTS,
  ELEMENTARY_FS,
  ELEMENTARY_PURPOSE,
} from "./tests/level-3/index.ts";
export type TestTabId =
  | "2a"
  | "2b"
  | "2c"
  | "mfs"
  | "3a"
  | "3b"
  | "3c"
  | "elementary-fs"
  | "4a"
  | "4b"
  | "4c"
  | "medium-fs";

export function marksFor(test: SetTest) {
  const tech = test.movements.reduce((n, m) => n + 10 * (m.coeff ?? 1), 0);
  const coll = (test.collectives ?? COLLECTIVES).reduce((n, c) => n + 10 * c.coeff, 0);
  return { tech, coll, total: tech + coll };
}
