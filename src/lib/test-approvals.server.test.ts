import assert from "node:assert/strict";
import { test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { asSql, database } from "./test-database.ts";
import { assignRiderTest } from "./rider-test-assignment.ts";
import { generatePlan, sanitisePlanConfig } from "./plan-builder.ts";
import {
  listTestApprovals,
  publishedTestIds,
  setTestApproval,
} from "./test-approvals.server.ts";
import { SEEDED_APPROVED_TEST_IDS } from "./test-registry.ts";

async function user(pg: PGlite, id: string, email: string, provider = "google") {
  await pg.query('insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)', [
    id,
    email,
  ]);
  await pg.query(
    'insert into account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values ($1, $2, $3, $2, now(), now())',
    [`account-${id}`, id, provider],
  );
}

test("seeded approvals are Novice 2A–2C, Medium 4A and the Level 2 freestyle", async () => {
  const pg = await database();
  const saved = process.env.BETA_ADMIN_EMAILS;
  process.env.BETA_ADMIN_EMAILS = "admin@example.com,password-admin@example.com";
  try {
    const sql = asSql(pg);
    assert.deepEqual(await publishedTestIds(sql), [...SEEDED_APPROVED_TEST_IDS].sort());
    const seeded = await listTestApprovals(sql);
    assert.equal(seeded.length, SEEDED_APPROVED_TEST_IDS.length);
    assert.ok(seeded.every((row) => row.approvedBy === "susan@manawa.tech" && row.approvedAt));

    await user(pg, "admin", "admin@example.com");
    await user(pg, "password", "password-admin@example.com", "credential");
    await user(pg, "rider", "rider@example.com");
    const config = sanitisePlanConfig(
      { horseName: "Bella", level: "Level 4", tests: ["4A"], shows: [], goals: [], startDate: "2026-11-02" },
      { horseName: "Bella", level: "Level 4" },
    );
    await pg.query("insert into horses (id, user_id, name, level) values ('horse', 'rider', 'Bella', 'Level 4')");
    await pg.query(
      "insert into plans (horse_id, user_id, config, plan) values ('horse', 'rider', $1::jsonb, $2::jsonb)",
      [JSON.stringify(config), JSON.stringify(generatePlan(config))],
    );

    await assert.rejects(setTestApproval(sql, "password", "4b", true), /Admins only/);
    await assert.rejects(setTestApproval(sql, "rider", "4b", true), /Admins only/);
    await assert.rejects(
      assignRiderTest(sql, { horseId: "horse", test: "4B", action: "add" }),
      /not published/,
    );
    assert.deepEqual(
      [...(await setTestApproval(sql, "admin", "4b", true))].sort(),
      [...SEEDED_APPROVED_TEST_IDS, "4b"].sort(),
    );
    const approved = await listTestApprovals(sql);
    assert.equal(approved.find((row) => row.testId === "4b")?.approvedBy, "admin");
    assert.deepEqual(await assignRiderTest(sql, { horseId: "horse", test: "4B", action: "add" }), {
      horseId: "horse",
      tests: ["4A", "4B"],
    });
    assert.deepEqual(
      [...(await setTestApproval(sql, "admin", "4b", false))].sort(),
      [...SEEDED_APPROVED_TEST_IDS].sort(),
    );
    await assert.rejects(setTestApproval(sql, "admin", "not-a-test", true), /Unknown test/);
    await assert.rejects(
      assignRiderTest(sql, { horseId: "horse", test: "4C", action: "add" }),
      /not published/,
    );
  } finally {
    if (saved === undefined) delete process.env.BETA_ADMIN_EMAILS;
    else process.env.BETA_ADMIN_EMAILS = saved;
    await pg.close();
  }
});
