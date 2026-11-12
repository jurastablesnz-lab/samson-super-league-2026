import {
  classLabel,
  horseSection,
  inferDressageTest,
  pickerTests,
  sectionForLevel,
  testFamily,
  TESTS_BY_SECTION,
} from "./dressage-test.ts";

export type ScoreRow = {
  id: string;
  date: string;
  showName: string;
  test: string;
  level: string;
  percent: number | null;
  place: string;
  status: string;
  dressageTest?: string;
};

export type RideView = ScoreRow & {
  resolved: string | null;
  family: string | null;
  section: string;
  classNo: string;
  detail: string;
};

export type TestGroup = {
  label: string;
  count: number;
  best: number | null;
  worst: number | null;
  average: number | null;
  rides: RideView[];
};

export type ResultBoard = {
  primary: { section: string; groups: TestGroup[] };
  others: { section: string; groups: TestGroup[] }[];
  unassigned: RideView[];
};

export function resolveRide(row: ScoreRow): RideView {
  const tagged = row.dressageTest?.trim() ?? "";
  const resolved = tagged || inferDressageTest(row);
  return {
    ...row,
    resolved,
    family: resolved ? testFamily(resolved) : null,
    section: sectionForLevel(row.level),
    classNo: classLabel(row.test),
    detail: /super\s*5/i.test(resolved ?? "") ? "Super 5" : "",
  };
}

function summarise(label: string, rides: RideView[]): TestGroup {
  const scored = rides.filter((ride) => ride.status === "ok" && ride.percent != null);
  const percents = scored.map((ride) => ride.percent as number);
  const total = percents.reduce((sum, n) => sum + n, 0);
  return {
    label,
    count: scored.length,
    best: percents.length ? Math.max(...percents) : null,
    worst: percents.length ? Math.min(...percents) : null,
    average: percents.length ? total / percents.length : null,
    rides: [...rides].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function groupResults(rows: ScoreRow[], horseLevel: string): ResultBoard {
  const rides = rows.map(resolveRide);
  const primaryName = horseSection(horseLevel || "Level 2");
  const labels =
    TESTS_BY_SECTION[primaryName] ??
    (/para|\bgrade\b/i.test(horseLevel) ? [] : TESTS_BY_SECTION["Level 2"]);
  const assigned = rides.filter((ride) => ride.family);
  const unassigned = rides
    .filter((ride) => !ride.family)
    .sort((a, b) => b.date.localeCompare(a.date));

  const primary = labels.map((label) =>
    summarise(
      label,
      assigned.filter((ride) => ride.section === primaryName && ride.family === label),
    ),
  );

  const otherNames = [
    ...new Set(
      rides
        .map((ride) => ride.section)
        .filter((name) => name !== primaryName && TESTS_BY_SECTION[name]),
    ),
  ];
  const others = otherNames.sort().map((section) => {
    const inSection = assigned.filter((ride) => ride.section === section);
    const names = [...new Set(inSection.map((ride) => ride.family as string))];
    return {
      section,
      groups: names.sort().map((label) =>
        summarise(
          label,
          inSection.filter((ride) => ride.family === label),
        ),
      ),
    };
  });

  return { primary: { section: primaryName, groups: primary }, others, unassigned };
}

export function testsForRide(level: string): string[] {
  return pickerTests(level);
}
