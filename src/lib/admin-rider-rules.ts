import { testById, testIdForName } from "./test-registry.ts";

/** True when this name is a sheet the caller can ride, not only a label. */
export function hasMovementData(name: string): boolean {
  return !!testById(testIdForName(name))?.viewId;
}

export function testsForPlan(tests: string[]): { name: string; nameOnly: boolean }[] {
  return tests.map((name) => ({ name, nameOnly: !hasMovementData(name) }));
}
