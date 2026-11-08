import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chunkRecheckKey,
  chunkResponseIsScript,
  chunkUrlFromMessage,
  isChunkLoadMessage,
} from "./chunk-load.ts";

const SCREEN =
  "Failed to fetch dynamically imported module: https://samson2026.grok.me/assets/admin-BnMGQLMm.js";

test("the admin chunk error from the live page is recognised and limited to that script", () => {
  assert.equal(isChunkLoadMessage(SCREEN), true);
  assert.equal(
    isChunkLoadMessage("error loading dynamically imported module: https://x/assets/a.js"),
    true,
  );
  assert.equal(isChunkLoadMessage("Importing a module script failed."), true);
  assert.equal(isChunkLoadMessage("Admins only"), false);
  const origin = "https://samson2026.grok.me";
  const url = "https://samson2026.grok.me/assets/admin-BnMGQLMm.js";
  assert.equal(chunkUrlFromMessage(SCREEN, origin), url);
  assert.equal(
    chunkUrlFromMessage(
      "Failed to fetch dynamically imported module: https://evil.example/assets/admin-BnMGQLMm.js",
      origin,
    ),
    null,
  );
  assert.equal(chunkUrlFromMessage("Importing a module script failed.", origin), null);
  assert.equal(chunkUrlFromMessage(SCREEN, origin)?.endsWith(".html") ?? false, false);
  assert.equal(chunkRecheckKey(url), `xsalute-chunk-recheck:${url}`);
});

test("only a 200 javascript response may trigger another reload", () => {
  assert.equal(chunkResponseIsScript(200, "application/javascript; charset=utf-8"), true);
  assert.equal(chunkResponseIsScript(200, "text/html; charset=utf-8"), false);
  assert.equal(chunkResponseIsScript(404, "application/javascript"), false);
  assert.equal(chunkResponseIsScript(200, null), false);
});
