/** Shared names-only flags, independent from test diagram implementation. */
export function hasMovementData(name: string): boolean {
  return (
    /^(?:novice\s*)?(?:2a|2b|2c|2b super 5)(?:[^0-9a-z]|$)/i.test(name.trim()) ||
    /(?:musical |musical )?freestyle|^mfs(?:[^0-9a-z]|$)/i.test(name)
  );
}

export function testsForPlan(tests: string[]): { name: string; nameOnly: boolean }[] {
  return tests.map((name) => ({ name, nameOnly: !hasMovementData(name) }));
}
