import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SEEDED_APPROVED_TEST_IDS,
  catalogTests,
  isPublishedTest,
  testIdForName,
  testsForLevelPublished,
} from "./test-registry.ts";

const approved = new Set(SEEDED_APPROVED_TEST_IDS);

test("Susan’s signed-off tests are the only seeded publications", () => {
  assert.deepEqual([...approved], ["2a", "2b", "2c", "4a"]);
  for (const name of ["Novice 2A", "2A", "2B", "2B Super 5", "2C", "Medium 4A", "4A"]) {
    assert.equal(isPublishedTest(name, approved), true, name);
  }
  for (const name of [
    "4B",
    "Medium 4B",
    "4C",
    "Level 2 musical freestyle",
    "Level 4 musical freestyle",
    "Training 1",
    "3A",
    "A brand new test",
  ]) {
    assert.equal(isPublishedTest(name, approved), false, name);
  }
});

test("riders only see published names, and new registry tests start unpublished", () => {
  assert.deepEqual(testsForLevelPublished("Level 2", approved), ["2A", "2B", "2C", "2B Super 5"]);
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
  assert.equal(isPublishedTest("preliminary-9z", approved), false);
});
