import assert from "node:assert/strict";
import { test } from "node:test";
import { clampGap, hearsNext, movementCall } from "./arena-caller.ts";
import type { Movement } from "./tests/types.ts";

const movement = {
  n: 1,
  steps: [
    { at: "A", do: "Enter in working trot" },
    { at: "X", do: "Halt, salute" },
  ],
  directive: "Square halt. Immobility.",
  draw: [],
  audioUrl: "/audio/2a-1.mp3",
} as Movement;

test("the caller speaks the written steps, and the directive only when asked", () => {
  const plain = movementCall(movement, false);
  assert.equal(plain.length, 1);
  assert.equal(plain[0].text, "A Enter in working trot. X Halt, salute");
  assert.equal(plain[0].audioUrl, "/audio/2a-1.mp3");
  const withIdeas = movementCall(movement, true);
  assert.equal(withIdeas.length, 2);
  assert.equal(withIdeas[1].text, "Square halt. Immobility.");
  assert.equal(withIdeas[1].audioUrl, undefined);
});

test("next is a word, and the auto gap stays in a usable range", () => {
  assert.equal(hearsNext("next"), true);
  assert.equal(hearsNext("okay next please"), true);
  assert.equal(hearsNext("halt at X"), false);
  assert.equal(clampGap(0), 2);
  assert.equal(clampGap(8.2), 8);
  assert.equal(clampGap(90), 60);
});
