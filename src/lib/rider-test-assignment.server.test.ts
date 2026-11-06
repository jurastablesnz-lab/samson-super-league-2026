import assert from "node:assert/strict";
import { test } from "node:test";
import { asSql, database } from "./test-database.ts";
import { assignRiderTest } from "./rider-test-assignment.ts";
import { requireVerifiedAdmin } from "./admin-user.server.ts";
import type { Sql } from "./db.ts";
async function assign(sql: Sql, adminId: string, input: Parameters<typeof assignRiderTest>[1]) {
  await requireVerifiedAdmin(adminId, sql);
  return assignRiderTest(sql, input);
}
import { generatePlan, sanitisePlanConfig } from "./plan-builder.ts";

test("admin can add/remove a horse test; non-admins and unknown horses are protected", async () => {
  const pg = await database();
  const saved = process.env.BETA_ADMIN_EMAILS;
  process.env.BETA_ADMIN_EMAILS = "admin@example.com";
  try {
    for (const [id, email] of [
      ["admin", "admin@example.com"],
      ["rider", "rider@example.com"],
      ["stranger", "stranger@example.com"],
    ] as const) {
      await pg.query(
        'insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)',
        [id, email],
      );
      await pg.query(
        'insert into account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values ($1, $2, $3, $2, now(), now())',
        [`account-${id}`, id, "google"],
      );
      await pg.query("insert into riders (user_id) values ($1)", [id]);
    }
    const config = sanitisePlanConfig(
      {
        horseName: "Bella",
        level: "Level 2",
        tests: ["2A"],
        shows: [],
        goals: ["confidence"],
        startDate: "2026-11-02",
      },
      { horseName: "Bella", level: "Level 2" },
    );
    const progress = { done: { session1: true }, pack: {} };
    await pg.query(
      "insert into horses (id, user_id, name, level) values ('horse', 'rider', 'Bella', 'Level 2')",
    );
    await pg.query(
      "insert into plans (horse_id, user_id, config, plan, progress) values ('horse', 'rider', $1::jsonb, $2::jsonb, $3::jsonb)",
      [JSON.stringify(config), JSON.stringify(generatePlan(config)), JSON.stringify(progress)],
    );
    await pg.query(
      "insert into horses (id, user_id, name, level) values ('other', 'stranger', 'Secret', 'Level 2')",
    );
    await pg.query(
      "insert into plans (horse_id, user_id, config) values ('other', 'stranger', '{}')",
    );
    const sql = asSql(pg);
    assert.deepEqual(await assign(sql, "admin", { horseId: "horse", test: "2C", action: "add" }), {
      horseId: "horse",
      tests: ["2A", "2C"],
    });
    assert.deepEqual(await assign(sql, "admin", { horseId: "horse", test: "2C", action: "add" }), {
      horseId: "horse",
      tests: ["2A", "2C"],
    });
    await assign(sql, "admin", { horseId: "horse", test: "2A", action: "remove" });
    const stored = await pg.query<{
      config: { tests: string[]; startDate?: string };
      plan: { tests: string[]; weeks: unknown[] };
      progress: unknown;
    }>("select config, plan, progress from plans where horse_id = 'horse'");
    assert.deepEqual(stored.rows[0].config.tests, ["2C"]);
    assert.deepEqual(stored.rows[0].plan.tests, ["2C"]);
    assert.equal(stored.rows[0].config.startDate, "2026-11-02");
    assert.deepEqual(stored.rows[0].progress, progress);
    await assert.rejects(
      assign(sql, "rider", { horseId: "horse", test: "2B", action: "add" }),
      /Admins only/,
    );
    await assert.rejects(
      assign(sql, "admin", { horseId: "unknown", test: "2B", action: "add" }),
      /Horse not found/,
    );
    await assert.rejects(
      assign(sql, "admin", { horseId: "horse", test: "3A", action: "add" }),
      /level/,
    );
    await assert.rejects(
      assign(sql, "admin", { horseId: "horse", test: "2B", action: "remove" }),
      /not assigned/,
    );
    assert.deepEqual(
      (await pg.query("select config->'tests' as tests from plans where horse_id = 'horse'")).rows,
      [{ tests: ["2C"] }],
    );
  } finally {
    if (saved === undefined) delete process.env.BETA_ADMIN_EMAILS;
    else process.env.BETA_ADMIN_EMAILS = saved;
    await pg.close();
  }
});
