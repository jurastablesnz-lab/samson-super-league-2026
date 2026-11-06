/**
 * Every test a rider can be offered. Sheets live in code; publication lives in
 * `test_approvals`. A test that is not in that table is a draft.
 */
import { TESTS_BY_LEVEL } from "./plan-builder.ts";
import {
  ELEMENTARY_FS,
  MEDIUM_FS,
  MFS_SHEET,
  SET_0_TESTS,
  SET_1_TESTS,
  SET_3_TESTS,
  SET_4_TESTS,
  SET_TESTS,
} from "./esnz-tests.ts";

export type CatalogTest = {
  id: string;
  name: string;
  levels: string[];
  aliases: string[];
  /** Diagram tab, when this test has a sheet view. */
  viewId?: string;
};

/** ESNZ tests Susan has signed off. Everything else starts as a draft. */
export const SEEDED_APPROVED_TEST_IDS = ["2a", "2b", "2c", "4a"] as const;

function slug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function diagramTests(): CatalogTest[] {
  const sheets = [
    ...[...SET_0_TESTS, ...SET_1_TESTS, ...SET_TESTS, ...SET_3_TESTS, ...SET_4_TESTS].map((test) => ({
      id: test.id,
      name: test.name,
      aliases: [test.short, test.name],
      viewId: test.id,
    })),
    {
      id: MFS_SHEET.id,
      name: MFS_SHEET.name,
      aliases: [MFS_SHEET.short, MFS_SHEET.name, "Level 2 musical freestyle", "L2 MFS"],
      viewId: "mfs" as const,
    },
    {
      id: ELEMENTARY_FS.id,
      name: ELEMENTARY_FS.name,
      aliases: [
        ELEMENTARY_FS.short,
        ELEMENTARY_FS.name,
        "Level 3 musical freestyle",
        "L3 MFS",
      ],
      viewId: "elementary-fs" as const,
    },
    {
      id: MEDIUM_FS.id,
      name: MEDIUM_FS.name,
      aliases: [MEDIUM_FS.short, MEDIUM_FS.name, "Level 4 musical freestyle", "L4 MFS"],
      viewId: "medium-fs" as const,
    },
  ];
  return sheets.map((test) => ({ ...test, levels: [] as string[] }));
}

let cached: CatalogTest[] | null = null;

/** Stable catalog. New code-level tests appear here automatically and stay drafts until approved. */
export function catalogTests(): CatalogTest[] {
  if (cached) return cached;
  const tests = diagramTests();
  const twoB = tests.find((test) => test.id === "2b");
  if (twoB && !twoB.aliases.includes("2B Super 5")) twoB.aliases.push("2B Super 5");
  const byAlias = new Map<string, CatalogTest>();
  for (const test of tests) {
    byAlias.set(test.id, test);
    byAlias.set(test.name.toLowerCase(), test);
    for (const alias of test.aliases) byAlias.set(alias.toLowerCase(), test);
  }
  for (const [level, names] of Object.entries(TESTS_BY_LEVEL)) {
    for (const name of names) {
      const existing = byAlias.get(name.toLowerCase());
      if (existing) {
        if (!existing.levels.includes(level)) existing.levels.push(level);
        continue;
      }
      const id = slug(name);
      const created: CatalogTest = { id, name, levels: [level], aliases: [name] };
      tests.push(created);
      byAlias.set(id, created);
      byAlias.set(name.toLowerCase(), created);
    }
  }
  cached = tests;
  return tests;
}

export function testById(id: string): CatalogTest | undefined {
  return catalogTests().find((test) => test.id === id);
}

/** Registry id for a wizard or admin-picker name. Unknown names stay unpublished. */
export function testIdForName(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return "";
  const hit = catalogTests().find(
    (test) =>
      test.id === key ||
      test.name.toLowerCase() === key ||
      test.aliases.some((alias) => alias.toLowerCase() === key),
  );
  return hit?.id ?? slug(name);
}

export function isPublishedTest(nameOrId: string, approvedIds: Iterable<string>): boolean {
  const id = testById(nameOrId)?.id ?? testIdForName(nameOrId);
  return new Set(approvedIds).has(id);
}

/** Names a rider may choose at this level. Drafts stay out unless `includeDrafts`. */
export function testsForLevelPublished(
  level: string,
  approvedIds: Iterable<string>,
  includeDrafts = false,
): string[] {
  const approved = new Set(approvedIds);
  return (TESTS_BY_LEVEL[level] ?? TESTS_BY_LEVEL["Level 2"]).filter(
    (name) => includeDrafts || approved.has(testIdForName(name)),
  );
}
