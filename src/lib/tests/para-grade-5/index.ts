import type { SetTest } from "../types.ts";
import { TEST_GV_A } from "./grand-prix-a.ts";
import { TEST_GV_B } from "./grand-prix-b.ts";

export { TEST_GV_A, TEST_GV_B };
export { GRADE_V_FS } from "./freestyle.ts";
export { GRADE_V_PURPOSE } from "./shared.ts";
export const SET_GV_TESTS: SetTest[] = [TEST_GV_A, TEST_GV_B];
