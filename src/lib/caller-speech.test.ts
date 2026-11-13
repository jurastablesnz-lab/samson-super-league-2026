import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callerSpeechLines,
  instructionText,
  resolveClipUrl,
  speechHash,
  speechText,
  TEST_SOUND_TEXT,
  ttsCostUsd,
} from "./caller-speech.ts";
import { TEST_2B } from "./tests/level-2/novice-2B.ts";

test("a line keeps its hash for the same voice and text", async () => {
  const first = await speechHash("ara", "  Enter at A  ");
  const again = await speechHash("ara", "Enter at A");
  const other = await speechHash("eve", "Enter at A");
  assert.equal(first, again);
  assert.notEqual(first, other);
  assert.equal(speechText("  Hello   Susan "), "Hello Susan");
});

test("the caller prepares the instruction and the cue, not the directive", () => {
  const lines = callerSpeechLines(
    [
      {
        n: 1,
        steps: [
          { at: "A", do: "Enter in working trot" },
          { at: "X", do: "Halt, salute" },
        ],
      },
    ],
    [{ n: 1, text: "Keep the halt still." }],
  );
  assert.deepEqual(lines, [TEST_SOUND_TEXT, "A Enter in working trot. X Halt, salute", "Keep the halt still."]);
  assert.equal(instructionText({ steps: [{ at: "A", do: "Enter in working trot" }] }), "A Enter in working trot");
  assert.equal(resolveClipUrl({ text: "Keep the halt still." }, { "Keep the halt still.": "blob:cue" }), "blob:cue");
  assert.equal(resolveClipUrl({ text: "A Enter", audioUrl: "/file.mp3" }, {}), "/file.mp3");
});

test("Novice 2B speech stays within a few cents the first time it is generated", () => {
  const cues = TEST_2B.movements.map((movement) => ({
    n: movement.n,
    text: `Movement ${movement.n}. Keep the halt still and attentive, staying on contact.`,
  }));
  const lines = callerSpeechLines(TEST_2B.movements, cues);
  const chars = lines.reduce((sum, line) => sum + line.length, 0);
  const cost = ttsCostUsd(chars);
  assert.equal(lines[0], TEST_SOUND_TEXT);
  assert.equal(lines.length, 1 + TEST_2B.movements.length * 2);
  assert.ok(chars > 2000 && chars < 8000, `unexpected character count ${chars}`);
  assert.ok(cost < 0.15, `unexpected cost ${cost} for ${chars} characters`);
});
