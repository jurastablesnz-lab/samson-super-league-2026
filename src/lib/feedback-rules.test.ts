import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_VOICE_SECONDS,
  baseAudioMime,
  cleanFeedback,
  deviceLabel,
  formatDuration,
  pickVoiceMime,
  voiceExtension,
} from "./feedback-rules.ts";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

test("iPhone Safari records MP4/AAC, Chrome falls back to WebM", () => {
  const safari = new Set(["audio/mp4", "audio/mp4;codecs=mp4a.40.2"]);
  assert.equal(
    pickVoiceMime((t) => safari.has(t)),
    "audio/mp4",
  );
  const oldChrome = new Set(["audio/webm;codecs=opus", "audio/webm"]);
  assert.equal(
    pickVoiceMime((t) => oldChrome.has(t)),
    "audio/webm;codecs=opus",
  );
  assert.equal(
    pickVoiceMime(() => false),
    "",
  );
  assert.equal(
    pickVoiceMime(() => {
      throw new Error("unknown type");
    }),
    "",
  );
});

test("audio types are normalised and get a safe file extension", () => {
  assert.equal(baseAudioMime("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(baseAudioMime("video/mp4"), "audio/mp4");
  assert.equal(baseAudioMime("audio/x-m4a"), "audio/mp4");
  assert.equal(baseAudioMime("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(baseAudioMime("text/html"), "");
  assert.equal(baseAudioMime("audio/<script>"), "");
  assert.equal(voiceExtension("audio/mp4"), "m4a");
  assert.equal(voiceExtension("audio/aac"), "aac");
  assert.equal(voiceExtension("audio/webm;codecs=opus"), "webm");
  assert.equal(voiceExtension("application/pdf"), "");
});

test("feedback needs a message or a voice note", () => {
  assert.throws(() => cleanFeedback({ message: "   " }, false), /Type a message or record/);
  const voiceOnly = cleanFeedback({ message: "", audioMs: "61000" }, true);
  assert.equal(voiceOnly.message, "");
  assert.equal(voiceOnly.audioMs, 61000);
});

test("feedback fields are trimmed, capped and typed", () => {
  const draft = cleanFeedback(
    {
      kind: "bug",
      message: "  The caller skipped C  ",
      page: "/ · Tests · Galileo",
      appVersion: "35efb03 · 2026-11-26 14:05 NZ",
      userAgent: IPHONE_UA,
      audioMs: "999999999",
    },
    true,
  );
  assert.equal(draft.kind, "bug");
  assert.equal(draft.message, "The caller skipped C");
  assert.equal(draft.audioMs, (MAX_VOICE_SECONDS + 5) * 1000);
  assert.equal(cleanFeedback({ kind: "rant", message: "hi" }, false).kind, "general");
  assert.equal(cleanFeedback({ message: "hi", audioMs: "5000" }, false).audioMs, 0);
  assert.equal(cleanFeedback({ message: "x".repeat(9000) }, false).message.length, 4000);
});

test("durations and devices read well in the admin list", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65_000), "1:05");
  assert.equal(formatDuration(120_000), "2:00");
  assert.equal(deviceLabel(IPHONE_UA), "iPhone (iOS 18.1) · Safari");
  assert.equal(
    deviceLabel(`${IPHONE_UA} (home-screen app)`),
    "iPhone (iOS 18.1) · Safari · home-screen app",
  );
  assert.equal(
    deviceLabel(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    ),
    "Windows · Chrome",
  );
  assert.equal(deviceLabel(""), "Unknown device");
});
