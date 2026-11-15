/**
 * Every test a rider can be offered. Sheets live in code; publication lives in
 * `test_approvals`. A test that is not in that table is a draft.
 */
import { TESTS_BY_LEVEL, nextLevel, testsForLevel } from "./plan-builder.ts";
import {
  ADVANCED_FS,
  ADVANCED_MEDIUM_FS,
  GRADE_1_FS,
  GRADE_2_FS,
  GRADE_3_FS,
  GRADE_4_FS,
  GRADE_V_FS,
  INTERMEDIATE_I_FS,
  ELEMENTARY_FS,
  MEDIUM_FS,
  MFS_SHEET,
  SET_0_TESTS,
  SET_1_TESTS,
  SET_3_TESTS,
  SET_4_TESTS,
  SET_5_TESTS,
  SET_6_TESTS,
  SET_7_TESTS,
  SET_EVENTING_TESTS,
  SET_G1_TESTS,
  SET_G2_TESTS,
  SET_G3_TESTS,
  SET_G4_TESTS,
  SET_GV_TESTS,
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
export const SEEDED_APPROVED_TEST_IDS = ["2a", "2b", "2c", "4a", "mfs"] as const;

function slug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function diagramTests(): CatalogTest[] {
  const sheets = [
    ...[
      ...SET_0_TESTS,
      ...SET_1_TESTS,
      ...SET_TESTS,
      ...SET_3_TESTS,
      ...SET_4_TESTS,
      ...SET_5_TESTS,
      ...SET_6_TESTS,
      ...SET_GV_TESTS,
      ...SET_G1_TESTS,
      ...SET_G2_TESTS,
      ...SET_G3_TESTS,
      ...SET_G4_TESTS,
      ...SET_7_TESTS,
      ...SET_EVENTING_TESTS,
    ].map((test) => ({
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
      aliases: [ELEMENTARY_FS.short, ELEMENTARY_FS.name, "Level 3 musical freestyle", "L3 MFS"],
      viewId: "elementary-fs" as const,
    },
    {
      id: ADVANCED_MEDIUM_FS.id,
      name: ADVANCED_MEDIUM_FS.name,
      aliases: [
        ADVANCED_MEDIUM_FS.short,
        ADVANCED_MEDIUM_FS.name,
        "Level 5 musical freestyle",
        "L5 MFS",
      ],
      viewId: "adv-medium-fs" as const,
    },
    {
      id: ADVANCED_FS.id,
      name: ADVANCED_FS.name,
      aliases: [ADVANCED_FS.short, ADVANCED_FS.name, "Level 6 musical freestyle", "L6 MFS"],
      viewId: "advanced-fs" as const,
    },
    {
      id: INTERMEDIATE_I_FS.id,
      name: INTERMEDIATE_I_FS.name,
      aliases: [
        INTERMEDIATE_I_FS.short,
        INTERMEDIATE_I_FS.name,
        "FEI Intermediate I Freestyle",
        "Intermediate I Freestyle",
      ],
      viewId: "int-i-fs" as const,
    },
    {
      id: GRADE_1_FS.id,
      name: GRADE_1_FS.name,
      aliases: [GRADE_1_FS.short, GRADE_1_FS.name, "Grade I Freestyle"],
      viewId: "g1-fs" as const,
    },
    {
      id: GRADE_2_FS.id,
      name: GRADE_2_FS.name,
      aliases: [GRADE_2_FS.short, GRADE_2_FS.name, "Grade II Freestyle"],
      viewId: "g2-fs" as const,
    },
    {
      id: GRADE_3_FS.id,
      name: GRADE_3_FS.name,
      aliases: [GRADE_3_FS.short, GRADE_3_FS.name, "Grade III Freestyle"],
      viewId: "g3-fs" as const,
    },
    {
      id: GRADE_4_FS.id,
      name: GRADE_4_FS.name,
      aliases: [GRADE_4_FS.short, GRADE_4_FS.name, "Grade IV Freestyle"],
      viewId: "g4-fs" as const,
    },
    {
      id: GRADE_V_FS.id,
      name: GRADE_V_FS.name,
      aliases: [
        GRADE_V_FS.short,
        GRADE_V_FS.name,
        "Grade V Freestyle",
        "Grade V musical freestyle",
      ],
      viewId: "gv-fs" as const,
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

/**
 * Diagram tabs for one horse. A level's own sheets (2A, 2B, 2C, MFS at Level 2)
 * plus any extra test the horse has been given. Drafts stay hidden unless the
 * viewer is an admin.
 */
export function visibleDiagramIds(opts: {
  level?: string;
  tests?: string[];
  approvedIds: Iterable<string>;
  isAdmin?: boolean;
}): string[] {
  const approved = new Set(opts.approvedIds);
  const scoped = opts.level != null || opts.tests != null;
  const levelNames = !opts.level
    ? []
    : (TESTS_BY_LEVEL[opts.level] ??
      (/para|\bgrade\b/i.test(opts.level) ? testsForLevel(opts.level) : []));
  const levelIds = new Set(levelNames.map((name) => testIdForName(name)));
  const selected = new Set((opts.tests ?? []).map((name) => testIdForName(name)));
  const visible = catalogTests().filter((item) => {
    if (!item.viewId) return false;
    if (!opts.isAdmin && !approved.has(item.id)) return false;
    if (scoped && !levelIds.has(item.id) && !selected.has(item.id)) return false;
    return true;
  });
  const ids: string[] = [];
  const push = (viewId: string) => {
    if (!ids.includes(viewId)) ids.push(viewId);
  };
  for (const item of visible) {
    if (!scoped || levelIds.has(item.id)) push(item.viewId as string);
  }
  for (const item of visible) {
    if (scoped && selected.has(item.id) && !levelIds.has(item.id)) push(item.viewId as string);
  }
  return ids;
}

export function isPublishedTest(nameOrId: string, approvedIds: Iterable<string>): boolean {
  const id = testById(nameOrId)?.id ?? testIdForName(nameOrId);
  return new Set(approvedIds).has(id);
}

function offeredNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const list of Object.values(TESTS_BY_LEVEL)) {
    for (const name of list) names.set(name.toLowerCase(), name);
  }
  return names;
}

/**
 * The name the setup list and the admin picker store.
 * "Elementary 3A" and "3a" both become "3A". An unknown name returns null.
 */
export function canonicalPickerName(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const offered = offeredNames();
  const exact = offered.get(key);
  if (exact) return exact;
  const test = catalogTests().find(
    (item) =>
      item.id === key ||
      item.name.toLowerCase() === key ||
      item.aliases.some((alias) => alias.toLowerCase() === key),
  );
  if (!test) return null;
  for (const alias of [test.name, ...test.aliases]) {
    const listed = offered.get(alias.toLowerCase());
    if (listed) return listed;
  }
  return test.aliases[0] ?? test.name;
}

/** Whether a typed test can be added, and the message to show when it cannot. */
export function testAddDecision(
  raw: string,
  opts: { isAdmin: boolean; approvedIds: Iterable<string> },
): { ok: true; name: string } | { ok: false; error: string } {
  const typed = raw.trim();
  if (!typed) return { ok: false, error: "Type the test name, for example 3A." };
  const name = canonicalPickerName(typed);
  if (!name) return { ok: false, error: `No test called "${typed}". Check the spelling, for example 3A.` };
  if (!opts.isAdmin && !isPublishedTest(name, opts.approvedIds)) {
    return {
      ok: false,
      error: `${name} is not published yet, so it can't be added. Approve it on the Admin page first.`,
    };
  }
  return { ok: true, name };
}

/** Library tests matching a typed code, best match first. Drafts stay out unless `isAdmin`. */
export function suggestLibraryTests(
  raw: string,
  opts: { isAdmin: boolean; approvedIds: Iterable<string> },
): string[] {
  const key = raw.trim().toLowerCase();
  if (!key) return [];
  const ranked: { name: string; score: number }[] = [];
  const seen = new Set<string>();
  const take = (label: string) => {
    const name = canonicalPickerName(label);
    if (!name || seen.has(name.toLowerCase())) return;
    if (!opts.isAdmin && !isPublishedTest(name, opts.approvedIds)) return;
    const folded = name.toLowerCase();
    const alias = label.toLowerCase();
    const score = folded.startsWith(key) || alias.startsWith(key) ? 0 : folded.includes(key) || alias.includes(key) ? 1 : -1;
    if (score < 0) return;
    seen.add(folded);
    ranked.push({ name, score });
  };
  for (const list of Object.values(TESTS_BY_LEVEL)) {
    for (const name of list) take(name);
  }
  for (const test of catalogTests()) {
    take(test.name);
    for (const alias of test.aliases) take(alias);
  }
  ranked.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return ranked.map((item) => item.name).slice(0, 8);
}

/** The next competition level, with the real tests a rider may school. */
export function trainUpTests(
  level: string,
  approvedIds: Iterable<string>,
  includeDrafts = false,
): { level: string; tests: string[]; waiting: string[] } | null {
  const up = nextLevel(level);
  if (!up) return null;
  return {
    level: up,
    tests: testsForLevelPublished(up, approvedIds, includeDrafts),
    waiting: testsForLevel(up).filter((name) => !isPublishedTest(name, approvedIds)),
  };
}

/** Names a rider may choose at this level. Drafts stay out unless `includeDrafts`. */
export function testsForLevelPublished(
  level: string,
  approvedIds: Iterable<string>,
  includeDrafts = false,
): string[] {
  const approved = new Set(approvedIds);
  return testsForLevel(level).filter((name) => includeDrafts || approved.has(testIdForName(name)));
}
