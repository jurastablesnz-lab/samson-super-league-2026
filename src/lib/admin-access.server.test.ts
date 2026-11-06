import assert from "node:assert/strict";
import { test } from "node:test";

import { isAdminIdentity } from "./beta-admin.ts";

test("admin checks require both an allow-listed email and a Google account", () => {
  const emails = ["admin@example.com"];
  assert.equal(isAdminIdentity("admin@example.com", emails, ["google"]), true);
  assert.equal(isAdminIdentity("admin@example.com", emails, ["grok-google"]), true);
  assert.equal(isAdminIdentity("admin@example.com", emails, ["credential"]), false);
  assert.equal(isAdminIdentity("rider@example.com", emails, ["google"]), false);
  assert.equal(isAdminIdentity(null, emails, ["google"]), false);
});
