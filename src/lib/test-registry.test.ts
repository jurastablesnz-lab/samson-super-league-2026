import assert from "node:assert/strict";
import { test } from "node:test";
import { nextLevel, testsForLevel } from "./plan-builder.ts";
import {
  SEEDED_APPROVED_TEST_IDS,
  catalogTests,
  isPublishedTest,
  testIdForName,
  testsForLevelPublished,
  visibleDiagramIds,
} from "./test-registry.ts";

const approved = new Set(SEEDED_APPROVED_TEST_IDS);

test("Susan’s signed-off tests are the only seeded publications", () => {
  assert.deepEqual([...approved], ["2a", "2b", "2c", "4a", "mfs"]);
  for (const name of [
    "Novice 2A",
    "2A",
    "2B",
    "2B Super 5",
    "2C",
    "Medium 4A",
    "4A",
    "Level 2 musical freestyle",
    "L2 MFS",
  ]) {
    assert.equal(isPublishedTest(name, approved), true, name);
  }
  for (const name of [
    "4B",
    "Medium 4B",
    "4C",
    "Level 4 musical freestyle",
    "Training 1",
    "3A",
    "A brand new test",
  ]) {
    assert.equal(isPublishedTest(name, approved), false, name);
  }
});

test("a Level 2 horse sees 2A, 2B, 2C and the musical freestyle sheet", () => {
  assert.deepEqual(
    visibleDiagramIds({ level: "Level 2", tests: ["2A", "2B", "2C"], approvedIds: approved }),
    ["2a", "2b", "2c", "mfs"],
  );
  assert.equal(
    visibleDiagramIds({ level: "Level 2", approvedIds: approved }).includes("4a"),
    false,
  );
  assert.deepEqual(
    visibleDiagramIds({
      level: "Level 2",
      tests: ["2B", "Level 2 musical freestyle"],
      approvedIds: [],
      isAdmin: true,
    }),
    ["2a", "2b", "2c", "mfs"],
  );
});

test("riders only see published names, and new registry tests start unpublished", () => {
  assert.deepEqual(testsForLevelPublished("Level 2", approved), [
    "2A",
    "2B",
    "2C",
    "2B Super 5",
    "Level 2 musical freestyle",
  ]);
  assert.deepEqual(testsForLevelPublished("Level 4", approved), ["4A"]);
  assert.deepEqual(testsForLevelPublished("Level 1", approved), []);
  assert.ok(testsForLevelPublished("Level 4", approved, true).includes("4B"));
  assert.equal(testIdForName("Level 2 musical freestyle"), "mfs");
  assert.equal(testIdForName("Level 4 musical freestyle"), "medium-fs");
  const ids = catalogTests().map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(catalogTests().some((item) => item.id === "4b" && item.viewId === "4b"));
  assert.equal(isPublishedTest("Introductory 0A", approved), false);
  assert.equal(isPublishedTest("Preliminary 1A", approved), false);
  assert.equal(isPublishedTest("1C", approved), false);
  assert.equal(isPublishedTest("Elementary 3A", approved), false);
  assert.equal(isPublishedTest("3B", approved), false);
  assert.equal(isPublishedTest("3C", approved), false);
  assert.equal(isPublishedTest("Level 3 musical freestyle", approved), false);
  assert.equal(testIdForName("Level 3 musical freestyle"), "elementary-fs");
  assert.equal(testIdForName("3A"), "3a");
  assert.equal(isPublishedTest("Advanced Medium 5A", approved), false);
  assert.equal(isPublishedTest("5B", approved), false);
  assert.equal(isPublishedTest("5C", approved), false);
  assert.equal(isPublishedTest("Level 5 musical freestyle", approved), false);
  assert.equal(isPublishedTest("Advanced 6A", approved), false);
  assert.equal(isPublishedTest("6B", approved), false);
  assert.equal(isPublishedTest("6C", approved), false);
  assert.equal(isPublishedTest("Level 6 musical freestyle", approved), false);
  assert.equal(testIdForName("Level 5 musical freestyle"), "adv-medium-fs");
  assert.equal(testIdForName("Level 6 musical freestyle"), "advanced-fs");
  assert.equal(testIdForName("5A"), "5a");
  assert.equal(testIdForName("6A"), "6a");
  assert.equal(isPublishedTest("Grade V Para Grand Prix A", approved), false);
  assert.equal(isPublishedTest("Grade V Para Grand Prix B", approved), false);
  assert.equal(isPublishedTest("Grade V Freestyle", approved), false);
  assert.equal(testIdForName("Grade V Para Grand Prix A"), "gv-a");
  assert.equal(testIdForName("Grade V Freestyle"), "gv-fs");
  assert.equal(isPublishedTest("FEI Prix St-Georges", approved), false);
  assert.equal(isPublishedTest("FEI Intermediate I", approved), false);
  assert.equal(isPublishedTest("FEI Intermediate I Freestyle", approved), false);
  assert.equal(testIdForName("FEI Prix St-Georges"), "psg");
  assert.equal(testIdForName("FEI Intermediate I"), "int-i");
  assert.equal(testIdForName("FEI Intermediate I Freestyle"), "int-i-fs");
  assert.equal(isPublishedTest("Grade I Para Grand Prix A", approved), false);
  assert.equal(testIdForName("Grade IV Para Grand Prix B"), "g4b");
  assert.deepEqual(testsForLevelPublished("Level 5", approved), []);
  assert.deepEqual(testsForLevelPublished("Level 6", approved), []);
  assert.equal(isPublishedTest("preliminary-9z", approved), false);
  assert.deepEqual(
    testsForLevel("Para Grade V").map((name) => testIdForName(name)),
    ["gv-a", "gv-b", "gv-fs"],
  );
  assert.deepEqual(
    testsForLevel("Para Grade I").map((name) => testIdForName(name)),
    ["g1a", "g1b", "g1-fs"],
  );
  assert.deepEqual(testsForLevelPublished("Para Grade V", approved), []);
  assert.equal(testsForLevelPublished("Para Grade V", approved).includes("2A"), false);
  assert.equal(nextLevel("Grand Prix"), null);
  assert.equal(nextLevel("Para Grade V"), null);
  assert.equal(nextLevel("Level 6"), "Level 7 / FEI Small Tour");
});
