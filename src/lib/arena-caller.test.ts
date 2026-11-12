import assert from "node:assert/strict";
import { test } from "node:test";
import { clampGap, hearsNext, movementCall, primeCallerSpeech, speechStatusMessage, voiceScore } from "./arena-caller.ts";
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
  const coached = movementCall(movement, false, {
    text: "Susan, sit deep for the halt.",
    audioUrl: "/audio/cue-1.mp3",
  });
  assert.deepEqual(
    coached.map((clip) => clip.text),
    ["A Enter in working trot. X Halt, salute", "Susan, sit deep for the halt."],
  );
  assert.equal(coached[1].audioUrl, "/audio/cue-1.mp3");
});

test("next is a word, and the auto gap stays in a usable range", () => {
  assert.equal(hearsNext("next"), true);
  assert.equal(hearsNext("okay next please"), true);
  assert.equal(hearsNext("halt at X"), false);
  assert.equal(clampGap(0), 2);
  assert.equal(clampGap(8.2), 8);
  assert.equal(clampGap(90), 60);
});

test("speech is primed inside the tap even when cancel throws", () => {
  const spoken: string[] = [];
  let resumed = false;
  const outcome = primeCallerSpeech(
    {
      paused: true,
      cancel() {
        throw new Error("nothing to cancel");
      },
      resume() {
        resumed = true;
      },
      speak(text) {
        spoken.push(text);
      },
    },
    ["Enter at A", "Susan, sit for the halt"],
  );
  assert.equal(outcome, "ok");
  assert.equal(resumed, true);
  assert.deepEqual(spoken, ["Enter at A", "Susan, sit for the halt"]);
  assert.match(speechStatusMessage("blocked") ?? "", /isn't on silent/);
  assert.equal(primeCallerSpeech(null, ["Hello"]), "unavailable");
});

test("a New Zealand natural voice outranks a generic English one", () => {
  const nz = voiceScore({ lang: "en-NZ", name: "Karen" });
  const us = voiceScore({ lang: "en-US", name: "Samantha" });
  const compact = voiceScore({ lang: "en-US", name: "Compact" });
  assert.ok(nz > us);
  assert.ok(us > compact);
});
