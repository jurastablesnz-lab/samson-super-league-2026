import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PART_SIZE,
  mimeAllowed,
  objectKey,
  partByteRange,
  partCount,
  r2CorsPolicy,
  readR2Env,
  uploadFraction,
} from "./media-object.ts";

const full = {
  R2_ACCOUNT_ID: "abc",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "xsalute-media",
};

test("cloud storage stays off unless every R2 variable is set", () => {
  assert.equal(readR2Env({}), null);
  assert.equal(readR2Env({ ...full, R2_SECRET_ACCESS_KEY: "  " }), null);
  assert.deepEqual(readR2Env(full), {
    accountId: "abc",
    accessKeyId: "key",
    secretAccessKey: "secret",
    bucket: "xsalute-media",
  });
});

test("object keys stay inside the rider's prefix", () => {
  assert.equal(objectKey("rider_1", "video", "v-1"), "users/rider_1/video/v-1");
  assert.throws(() => objectKey("rider", "video", "../secret"));
  assert.throws(() => objectKey("rider/other", "music", "freestyle-1"));
});

test("parts cover the file and the last one can be short", () => {
  assert.equal(partCount(0), 0);
  assert.equal(partCount(PART_SIZE), 1);
  assert.equal(partCount(PART_SIZE + 1), 2);
  assert.deepEqual(partByteRange(1, 100, 40), { start: 0, end: 40 });
  assert.deepEqual(partByteRange(3, 100, 40), { start: 80, end: 100 });
  assert.equal(uploadFraction(40, 10, 100), 0.5);
  assert.equal(uploadFraction(100, 0, 100), 0.99);
});

test("only the expected file types are accepted", () => {
  assert.equal(mimeAllowed("video", "video/mp4", "test.mp4"), true);
  assert.equal(mimeAllowed("video", "", "clip.mov"), true);
  assert.equal(mimeAllowed("video", "application/pdf", "notes.pdf"), false);
  assert.equal(mimeAllowed("music", "audio/mpeg", "ride.mp3"), true);
  assert.equal(mimeAllowed("floorplan", "application/pdf", "plan.pdf"), true);
  assert.equal(mimeAllowed("floorplan", "audio/mpeg", "music.mp3"), false);
});

test("the bucket CORS policy exposes ETag for multipart uploads", () => {
  const [rule] = r2CorsPolicy(["https://xsalute.example", "http://localhost:8080"]);
  assert.deepEqual(rule.AllowedMethods, ["GET", "PUT", "HEAD"]);
  assert.deepEqual(rule.ExposeHeaders, ["ETag"]);
  assert.ok(rule.AllowedOrigins.includes("http://localhost:8080"));
});
