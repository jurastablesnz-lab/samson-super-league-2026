import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBytes, storageShortfall } from "./media-db.ts";

test("a video that fits has no shortfall, and one that does not names the space", () => {
  assert.equal(
    storageShortfall(500 * 1024 * 1024, { quota: 2 * 1024 ** 3, usage: 100 * 1024 ** 2 }),
    null,
  );
  const message = storageShortfall(900 * 1024 ** 2, { quota: 1024 ** 3, usage: 400 * 1024 ** 2 });
  assert.match(message ?? "", /900 MB/);
  assert.match(message ?? "", /624 MB/);
  assert.equal(storageShortfall(10, null), null);
  assert.match(formatBytes(1.5 * 1024 ** 3), /1\.5 GB/);
});
