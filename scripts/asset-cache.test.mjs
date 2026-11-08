import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSET_CACHE_CONTROL, assetCacheIsReusableFailure } from "./asset-cache.mjs";

test("asset responses are revalidated and a year-long miss is treated as a sticky failure", () => {
  assert.equal(assetCacheIsReusableFailure(ASSET_CACHE_CONTROL), false);
  assert.equal(assetCacheIsReusableFailure("public, max-age=31536000"), true);
  assert.equal(assetCacheIsReusableFailure("public, max-age=31536000, immutable"), true);
});
