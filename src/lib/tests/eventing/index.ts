import type { SetTest } from "../types.ts";
import { TEST_EV_A1 } from "./a/a1.ts";
import { TEST_EV_A2 } from "./a/a2.ts";
import { TEST_EV_A3 } from "./a/a3.ts";
import { TEST_EV_A4 } from "./a/a4.ts";
import { TEST_EV_A5 } from "./a/a5.ts";
import { TEST_EV_B1 } from "./b/b1.ts";
import { TEST_EV_B2 } from "./b/b2.ts";
import { TEST_EV_B3 } from "./b/b3.ts";
import { TEST_EV_B4 } from "./b/b4.ts";
import { TEST_EV_B5 } from "./b/b5.ts";
import { TEST_EV_C1 } from "./c/c1.ts";
import { TEST_EV_C2 } from "./c/c2.ts";
import { TEST_EV_C3 } from "./c/c3.ts";
import { TEST_EV_C4 } from "./c/c4.ts";
import { TEST_EV_D1 } from "./d/d1.ts";
import { TEST_EV_D2 } from "./d/d2.ts";
import { TEST_EV_L1 } from "./l/l1.ts";
import { TEST_EV_L2 } from "./l/l2.ts";
import { TEST_EV_L3 } from "./l/l3.ts";
import { TEST_EV_L4 } from "./l/l4.ts";
import { TEST_EV_L5 } from "./l/l5.ts";

export {
  TEST_EV_L1,
  TEST_EV_L2,
  TEST_EV_L3,
  TEST_EV_L4,
  TEST_EV_L5,
  TEST_EV_A1,
  TEST_EV_A2,
  TEST_EV_A3,
  TEST_EV_A4,
  TEST_EV_A5,
  TEST_EV_B1,
  TEST_EV_B2,
  TEST_EV_B3,
  TEST_EV_B4,
  TEST_EV_B5,
  TEST_EV_C1,
  TEST_EV_C2,
  TEST_EV_C3,
  TEST_EV_C4,
  TEST_EV_D1,
  TEST_EV_D2,
};

export const SET_EV_L_TESTS: SetTest[] = [
  TEST_EV_L1,
  TEST_EV_L2,
  TEST_EV_L3,
  TEST_EV_L4,
  TEST_EV_L5,
];
export const SET_EV_A_TESTS: SetTest[] = [
  TEST_EV_A1,
  TEST_EV_A2,
  TEST_EV_A3,
  TEST_EV_A4,
  TEST_EV_A5,
];
export const SET_EV_B_TESTS: SetTest[] = [
  TEST_EV_B1,
  TEST_EV_B2,
  TEST_EV_B3,
  TEST_EV_B4,
  TEST_EV_B5,
];
export const SET_EV_C_TESTS: SetTest[] = [TEST_EV_C1, TEST_EV_C2, TEST_EV_C3, TEST_EV_C4];
export const SET_EV_D_TESTS: SetTest[] = [TEST_EV_D1, TEST_EV_D2];

export const SET_EVENTING_TESTS: SetTest[] = [
  ...SET_EV_L_TESTS,
  ...SET_EV_A_TESTS,
  ...SET_EV_B_TESTS,
  ...SET_EV_C_TESTS,
  ...SET_EV_D_TESTS,
];
