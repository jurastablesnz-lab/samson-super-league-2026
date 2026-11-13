import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callerSpeechLines,
  clipLooksFinished,
  instructionText,
  resolveClipUrl,
  speechHash,
  speechText,
  TEST_SOUND_TEXT,
  ttsCostUsd,
} from "./caller-speech.ts";
import { bareAudioMime } from "./caller-stt.ts";
import { TEST_2B } from "./tests/level-2/novice-2B.ts";

test("playback counts as finished near the end, and an iPhone recording type is accepted", () => {
  assert.equal(clipLooksFinished(4.8, 5), true);
  assert.equal(clipLooksFinished(1, 5), false);
  assert.equal(clipLooksFinished(1, Number.NaN), false);
  assert.equal(bareAudioMime("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(bareAudioMime("audio/webm;codecs=opus"), "audio/webm");
});

test("a line keeps its hash for the same voice and text", async () => {
  const first = await speechHash("ara", "  Enter at A  ");
  const again = await speechHash("ara", "Enter at A");
  const other = await speechHash("eve", "Enter at A");
  assert.equal(first, again);
  assert.notEqual(first, other);
  assert.equal(speechText("  Hello   Susan "), "Hello Susan");
});

test("the caller prepares the instruction, the cue, and the directive", () => {
  const lines = callerSpeechLines(
    [
      {
        n: 1,
        steps: [
          { at: "A", do: "Enter in working trot" },
          { at: "X", do: "Halt, salute" },
        ],
        directive: "Immobility (min. 3 secs)",
      },
    ],
    [{ n: 1, text: "Keep the halt still." }],
  );
  assert.deepEqual(lines, [
    TEST_SOUND_TEXT,
    "ay Enter in working trot. ex Halt, salute",
    "Keep the halt still.",
    "Immobility minimum 3 seconds",
  ]);
  assert.equal(instructionText({ steps: [{ at: "A", do: "Enter in working trot" }] }), "ay Enter in working trot");
  const overridden = callerSpeechLines(
    [{ n: 1, steps: [{ at: "P", do: "Circle left 15m" }] }],
    [{ n: 1, spoken: "pee circle left fifteen metres" }],
  );
  assert.deepEqual(overridden, [TEST_SOUND_TEXT, "pee circle left fifteen metres"]);
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
  for (const movement of TEST_2B.movements) {
    const directive = speechText(movement.directive);
    if (directive) assert.ok(lines.includes(directive), directive);
  }
  assert.ok(lines.length > 1 + TEST_2B.movements.length * 2);
  assert.ok(chars > 2000 && chars < 12000, `unexpected character count ${chars}`);
  assert.ok(cost < 0.2, `unexpected cost ${cost} for ${chars} characters`);
});
