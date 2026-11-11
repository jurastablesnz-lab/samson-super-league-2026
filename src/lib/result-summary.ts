/** Best, worst and average for kept scores, grouped by class or test name. */

export type ScoreInput = {
  test: string;
  level: string;
  percent: number | null;
  status: string;
};

export type TestScoreSummary = {
  key: string;
  label: string;
  level: string;
  count: number;
  best: number;
  worst: number;
  average: number;
};

function groupOf(test: string, level: string): { key: string; label: string; level: string } {
  const named = test.match(/·\s*(\d+)\s*$/)?.[1] ?? (/^\d+$/.test(test.trim()) ? test.trim() : "");
  const levelLabel = level.trim();
  if (named) return { key: `${levelLabel}|${named}`, label: named, level: levelLabel };
  const label = test.trim() || "Test";
  return { key: `${levelLabel}|${label}`, label, level: levelLabel };
}

export function summariseKeptScores(results: ScoreInput[]): TestScoreSummary[] {
  const groups = new Map<string, TestScoreSummary & { total: number }>();
  for (const result of results) {
    if (result.status !== "ok" || result.percent == null || !Number.isFinite(result.percent))
      continue;
    const group = groupOf(result.test, result.level);
    const current = groups.get(group.key) ?? {
      ...group,
      count: 0,
      best: result.percent,
      worst: result.percent,
      average: 0,
      total: 0,
    };
    current.count += 1;
    current.total += result.percent;
    current.best = Math.max(current.best, result.percent);
    current.worst = Math.min(current.worst, result.percent);
    current.average = current.total / current.count;
    groups.set(group.key, current);
  }
  return [...groups.values()]
    .map(({ total: _total, ...summary }) => summary)
    .sort(
      (a, b) =>
        a.level.localeCompare(b.level) ||
        a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
}
